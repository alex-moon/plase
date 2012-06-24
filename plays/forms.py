from django import forms
from django.forms.models import modelformset_factory
from plays.models import Place, Play
from django.contrib.gis.geos import fromstr
from django.contrib.gis.forms.fields import GeometryField

class PlayForm(forms.ModelForm):
    location = GeometryField(widget=forms.HiddenInput)
    class Meta:
        model = Play

class PlaceForm(forms.ModelForm):
    # todo: following violates DRY
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
