# from django.contrib.gis.geos import fromstr
from django.db.models.signals import post_save
from django.dispatch import receiver

from google.appengine.api import channel

from plays.models import Play, Place, ChannelRecord
from plays.forms import PlayForm, PlaceForm

from backbone.views import BackboneAPIView
import backbone


class PlaceView(BackboneAPIView):
    model = Place
    form = PlaceForm
    display_fields = ('id', 'name', 'listening_to', 'public')

    def queryset(self, request):
        #here = fromstr(b64decode(request.META['HTTP_WHERE']))
        #return self.model.objects.filter(pk__in=[x.place.pk for x in Play.objects.last_by_distance(here)])
        return self.model.all()

    def has_add_permission(self, request):
        return True

    def has_update_permission(self, request, obj):
        return True

    def get_object_detail(self, request, obj):
        response = super(PlaceView, self).get_object_detail(request, obj)

        if obj.play_set.count() == 0:
            #here = fromstr(b64decode(request.META['HTTP_WHERE']))
            play = Play(place=obj, nothing=True)#, location=here)
            play.save()

        return response

    def get_form_instance(self, request, data=None, instance=None):
        place_form = super(PlaceView, self).get_form_instance(request, data, instance)
        place_form.post_save = on_place_save
        return place_form


class PlayView(BackboneAPIView):
    model = Play
    form = PlayForm
    display_fields = ('id', 'artist', 'title', 'started', 'nothing')

    def queryset(self, request):
        #here = fromstr(b64decode(request.META['HTTP_WHERE']))
        #return self.model.objects.last_by_distance(here).filter(nothing=False)
        return self.model.all()

    def has_add_permission(self, request):
        return True

    def get_form_instance(self, request, data=None, instance=None):
        #here = fromstr(b64decode(request.META['HTTP_WHERE']))
        #data['location'] = here
        play_form = super(PlayView, self).get_form_instance(request, data, instance)
        play_form.post_save = on_play_save
        return play_form

    def serialize(self, obj, fields):
        play = super(PlayView, self).serialize(obj, fields)
        #play['latitude'] = obj.location.get_y()
        #play['longitude'] = obj.location.get_x()

        try:
            play['place'] = str(obj.place.key())
        except:
            play['place'] = obj.place
        return play


# @receiver(post_save, sender=Play)
def on_play_save(sender, instance=False, created=False, **kwargs):
    view = PlayView()
    data = {'play': view.serialize(instance, PlayView.display_fields)}
    for channel_record in ChannelRecord.all():
        channel.send_message(channel_record.token, view.json_dumps(data))


# @receiver(post_save, sender=Place)
def on_place_save(sender, instance=False, created=False, **kwargs):
    view = PlaceView()
    data = {'place': view.serialize(instance, PlaceView.display_fields)}
    for channel_record in ChannelRecord.all():
        channel.send_message(channel_record.token, view.json_dumps(data))

backbone.site.register(PlaceView)
backbone.site.register(PlayView)
