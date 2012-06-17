from django.db import models
from django.contrib.auth.models import User
from django.contrib.gis.db.models import PointField
import re

class Place(models.Model):
    name = models.CharField(max_length=200)
    summary = models.TextField()

    def __unicode__(self):
        return self.name
        
class Play(models.Model):
    place = models.ForeignKey(Place)
    artist = models.CharField(max_length=80, blank=False)
    title = models.CharField(max_length=100, blank=False)
    location = PointField()
    started = models.DateTimeField(auto_now_add=True)
    nothing = models.BooleanField(default=False)
    
    def __unicode__(self):
        when = self.started.strftime("%H:%M") # @todo better datetime representation
        if self.nothing:
            return "Nothing (%s)" % (when)
        return "%s - %s (%s)" % (self.artist, self.title, when)


