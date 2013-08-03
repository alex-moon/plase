from google.appengine.ext import db
from django.

class Place(db.Model):
    name = db.StringProperty()
    listening_to = db.StringProperty(required=False)
    public = db.StringProperty(required=False)

    def __unicode__(self):
        return self.name


# NB: see backbone_api module for post_save receiver
class Play(db.Model):
    place = db.ReferenceProperty(Place)
    artist = db.StringProperty(required=False)
    title = db.StringProperty(required=False)
    # location = PointField()
    started = db.DateTimeProperty(auto_now_add=True)
    nothing = db.BooleanProperty()

    def __unicode__(self):
        when = self.started.strftime("%H:%M")
        if self.nothing:
            return "Nothing (%s)" % (when)
        return "%s - %s (%s)" % (self.artist, self.title, when)


class Happening(db.Model):
    pass
