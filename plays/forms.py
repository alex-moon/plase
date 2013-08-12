from django import forms
from google.appengine.ext.db import djangoforms
from google.appengine.api import channel

import logging

from plays.models import Place, Play, ChannelRecord
from plays.services import PlaseService

# from django.contrib.gis.forms.fields import GeometryField


# handle post_save with a superclass
class ChannelSendingForm(djangoforms.ModelForm):
    def save(self):
        instance = super(ChannelSendingForm, self).save()
        data = PlaseService().json_dumps(instance)
        for channel_record in ChannelRecord.all():
            channel.send_message(channel_record.token, data)
        return instance


class PlayForm(ChannelSendingForm):
    class Meta:
        model = Play

    def clean(self):
        # logging.debug("PlayForm submitted: %s" % str(self.data))
        
        cleaned_data = super(PlayForm, self).clean()

        nothing = cleaned_data.get("nothing")
        artist = cleaned_data.get("artist")
        title = cleaned_data.get("title")

        if nothing:
            del cleaned_data["artist"]
            del cleaned_data["title"]
            cleaned_data["nothing"] = True  # normalise for consistency's sake

        else:
            cleaned_data["nothing"] = False

            msg = u"This field is required"
            if not artist:
                self._errors["artist"] = self.error_class([msg])
            if not title:
                self._errors["title"] = self.error_class([msg])

        return cleaned_data


class PlaceForm(ChannelSendingForm):
    listening_to = forms.ChoiceField(label='You are listening to a', choices=(
        ('', '--------'),
        ('band', 'Band/Solo Musician'),
        ('dj', 'DJ Set'),
        ('live', 'Live Set'),
        ('playlist', 'Playlist (CD, MP3, radio station, etc.)'),
    ), required=False)
    public = forms.ChoiceField(label='This event is', choices=(
        ('', '--------'),
        ('yes', 'Open to the public'),
        ('no', 'Invite-only'),
    ), required=False)

    class Meta:
        model = Place

