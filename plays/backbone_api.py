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
    display_fields = ('id', 'name', 'listening_to', 'public')

    """ @todo: """
    def queryset(self, request):
        return self.model.objects.filter(pk__in=[x.place.pk for x in PlayView().queryset(request)])

    def serialize(self, obj, fields):
        data = super(PlaceView, self).serialize(obj, fields)

        data['plays'] = []
        for play in obj.play_set.all().order_by('-started'):
            play_dict = play.__dict__

            play_dict['latitude'] = play.location.get_y()
            play_dict['longitude'] = play.location.get_x()

            del play_dict['_state']
            del play_dict['location']

            if 'last_play' not in data:
                data['last_play'] = play_dict
            data['plays'].append(play_dict)

        return data


class PlayView(BackboneAPIView):
    model = Play
    form = PlayForm
    display_fields = ('id', 'artist', 'title', 'started', 'nothing')

    def queryset(self, request):
        where = request.META['HTTP_WHERE']
        here = fromstr(b64decode(where))
        return self.model.objects.filter(nothing=False)\
                                 .annotate(max_started=Max('place__play__started'))\
                                 .filter(started=F('max_started')).distance(here)\
                                 .order_by('distance')

    def serialize(self, obj, fields):
        data = super(PlayView, self).serialize(obj, fields)

        # clean place and location a little for serialization
        data['place'] = obj.place.__dict__
        try:
            del data['place']['_state']
        except KeyError:
            pass

        data['latitude'] = obj.location.get_y()
        data['longitude'] = obj.location.get_x()

        return data


@receiver(post_save, sender=Play)
def on_play_save(sender, instance=False, created=False, **kwargs):
    print "post-save called! About to send new play over the wire..."
    view = PlayView()
    data = view.serialize(instance, PlayView.display_fields)
    connect = pika.BlockingConnection()
    channel = connect.channel()
    channel.basic_publish(exchange='', routing_key='plase', body=view.json_dumps(data))
    connect.close()

backbone.site.register(PlaceView)
backbone.site.register(PlayView)
