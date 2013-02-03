from django.db.models.aggregates import Max
from django.db.models import F
from django.contrib.gis.geos import fromstr
from django.db.models.signals import post_save
from django.dispatch import receiver

from plays.models import Play, Place
from plays.forms import PlayForm, PlaceForm

from backbone.views import BackboneAPIView
import backbone

from base64 import b64decode
import pika

class PlaceView(BackboneAPIView):
    model = Place
    form = PlaceForm
    display_fields = ('name', 'listening_to', 'public')

    """ @todo:
    def queryset(self, request):
        here = fromstr(b64decode(request.GET['where']))
        return self.model.objects.annotate(max_started=Max('play__started'))\
                                 .filter(play__started=F('max_started'))\
                                 .distance(here, field_name='play__location')\
                                 .order_by('distance')
    """

    def serialize(self, obj, fields):
        data = super(PlaceView, self).serialize(obj, fields)

        data['plays'] = []
        for play in obj.play_set.all().order_by('-started'):
            play_dict = play.__dict__

            play_dict['latitude'] = play.location.get_y()
            play_dict['longitude'] = play.location.get_x()

            del play_dict['_state']
            del play_dict['location']

            data['plays'].append(play_dict)

        return data


class PlayView(BackboneAPIView):
    model = Play
    form = PlayForm
    display_fields = ('artist', 'title', 'started', 'nothing')

    def queryset(self, request):
        here = fromstr(b64decode(request.GET['where']))
        return self.model.objects.filter(nothing=False)\
                                 .annotate(max_started=Max('place__play__started'))\
                                 .filter(started=F('max_started')).distance(here)\
                                 .order_by('distance')

    def serialize(self, obj, fields):
        data = super(PlayView, self).serialize(obj, fields)

        # clean place and location a little for serialization
        data['place'] = obj.place.__dict__
        del data['place']['_state']

        data['latitude'] = obj.location.get_y()
        data['longitude'] = obj.location.get_x()

        return data


@receiver(post_save, sender=Play)
def on_play_save(sender, instance=False, created=False, **kwargs):
    data = PlayView().serialize(instance, PlayView.display_fields)
    connect = pika.BlockingConnection()
    channel = connect.channel()
    channel.basic_publish(exchange='', routing_key='plase', body=PlayView.json_dumps(data))
    connect.close()

backbone.site.register(PlaceView)
backbone.site.register(PlayView)