from django.contrib.gis.db import models
from django.contrib.gis.db.models import PointField, GeoManager
from django.db.models.aggregates import Max
from django.db.models import F


class Place(models.Model):
    name = models.CharField(max_length=200)
    listening_to = models.CharField(max_length=10, blank=True)
    public = models.CharField(max_length=3, blank=True)

    objects = GeoManager()

    def __unicode__(self):
        return self.name


class PlayManager(GeoManager):
    def last_by_distance(self, here):
        return self.all().annotate(max_started=Max('place__play__started'))\
                         .filter(started=F('max_started')).distance(here)\
                         .order_by('distance')


# NB: see backbone_api module for post_save receiver
class Play(models.Model):
    place = models.ForeignKey(Place)
    artist = models.CharField(max_length=80, blank=True)
    title = models.CharField(max_length=100, blank=True)
    location = PointField()
    started = models.DateTimeField(auto_now_add=True)
    nothing = models.BooleanField()

    objects = PlayManager()

    def __unicode__(self):
        when = self.started.strftime("%H:%M")  # @todo better datetime representation
        if self.nothing:
            return "Nothing (%s)" % (when)
        return "%s - %s (%s)" % (self.artist, self.title, when)


class Happening(models.Model):
    pass
