from django.contrib.gis.geos import fromstr
from django.db.models.signals import post_save
from django.dispatch import receiver

from plays.models import Play, Place
from plays.forms import PlayForm, PlaceForm

from backbone.views import BackboneAPIView
import backbone

from base64 import b64decode
import pika
import json


class PlaceView(BackboneAPIView):
    model = Place
    form = PlaceForm
    display_fields = ('id', 'name', 'listening_to', 'public')

    def queryset(self, request):
        here = fromstr(b64decode(request.META['HTTP_WHERE']))
        return self.model.objects.filter(pk__in=[x.place.pk for x in Play.objects.last_by_distance(here)])

    def has_add_permission(self, request):
        return True

    def has_update_permission(self, request, obj):
        return True

    def get_form_instance(self, request, data=None, instance=None):
        data = data['place']
        here = fromstr(b64decode(request.META['HTTP_WHERE']))
        data['location'] = here
        return super(PlaceView, self).get_form_instance(request, data, instance)

    def get_object_detail(self, request, obj):
        data = json.loads(request.raw_post_data)
        try:
            import ipdb; ipdb.set_trace()
            data = data['last_play']
            data['place'] = obj
            here = fromstr(b64decode(request.META['HTTP_WHERE']))
            data['location'] = here
            play = Play(**data)
            play.save()
        except:
            pass

        return super(PlaceView, self).get_object_detail(request, obj)

    def serialize(self, obj, fields):
        place = super(PlaceView, self).serialize(obj, fields)

        data = {'place': place}
        try:
            last_play = obj.play_set.all().order_by('-started')[0]
            play_dict = last_play.__dict__

            play_dict['latitude'] = last_play.location.get_y()
            play_dict['longitude'] = last_play.location.get_x()
            play_dict['place'] = play_dict['place_id']

            del play_dict['_state']
            del play_dict['location']
            del play_dict['place_id']

            data['last_play'] = play_dict
            data['place']['last_play'] = play_dict['id']
        except IndexError:
            pass

        return data


class PlayView(BackboneAPIView):
    model = Play
    form = PlayForm
    display_fields = ('id', 'artist', 'title', 'started', 'nothing')

    def queryset(self, request):
        here = fromstr(b64decode(request.META['HTTP_WHERE']))
        return self.model.objects.last_by_distance(here).filter(nothing=False)

    def has_add_permission(self, request):
        return True

    def get_form_instance(self, request, data=None, instance=None):
        data = data['play']
        here = fromstr(b64decode(request.META['HTTP_WHERE']))
        data['location'] = here
        return super(PlayView, self).get_form_instance(request, data, instance)

    def serialize(self, obj, fields):
        play = super(PlayView, self).serialize(obj, fields)
        play['latitude'] = obj.location.get_y()
        play['longitude'] = obj.location.get_x()

        # clean place and location a little for serialization
        place = obj.place.__dict__
        try:
            del place['_state']
        except KeyError:
            pass

        # set foreign keys
        play['place'] = place['id']
        place['last_play'] = play['id']

        data = {'last_play': play, 'place': place}

        return data


@receiver(post_save, sender=Play)
def on_play_save(sender, instance=False, created=False, **kwargs):
    view = PlayView()
    data = view.serialize(instance, PlayView.display_fields)
    # print "sending over the wire: %s" % data
    connect = pika.BlockingConnection()
    channel = connect.channel()
    channel.basic_publish(exchange='', routing_key='plase', body=view.json_dumps(data))
    connect.close()


@receiver(post_save, sender=Place)
def on_place_save(sender, instance=False, created=False, **kwargs):
    view = PlaceView()
    data = view.serialize(instance, PlaceView.display_fields)
    # print "sending over the wire: %s" % data
    connect = pika.BlockingConnection()
    channel = connect.channel()
    channel.basic_publish(exchange='', routing_key='plase', body=view.json_dumps(data))
    connect.close()

backbone.site.register(PlaceView)
backbone.site.register(PlayView)
