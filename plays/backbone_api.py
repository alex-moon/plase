# from django.contrib.gis.geos import fromstr

from plays.models import Play, Place
from plays.forms import PlayForm, PlaceForm
from plays.services import PlaseService

from backbone.views import BackboneAPIView
import backbone


class PlaceView(BackboneAPIView):
    model = Place
    form = PlaceForm
    display_fields = PlaseService.PLACE_DISPLAY_FIELDS

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


class PlayView(BackboneAPIView):
    model = Play
    form = PlayForm
    display_fields = PlaseService.PLAY_DISPLAY_FIELDS

    def queryset(self, request):
        #here = fromstr(b64decode(request.META['HTTP_WHERE']))
        #return self.model.objects.last_by_distance(here).filter(nothing=False)
        return self.model.all()

    def has_add_permission(self, request):
        return True

    def get_form_instance(self, request, data=None, instance=None):
        #here = fromstr(b64decode(request.META['HTTP_WHERE']))
        #data['location'] = here
        return super(PlayView, self).get_form_instance(request, data, instance)


backbone.site.register(PlaceView)
backbone.site.register(PlayView)
