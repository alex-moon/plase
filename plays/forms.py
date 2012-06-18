from django import forms
from plays.models import Place, Play
from django.contrib.gis.geos import fromstr
from django.contrib.gis.forms.fields import GeometryField

class PlayForm(forms.ModelForm):
    location = GeometryField(widget=forms.HiddenInput)
    class Meta:
        model = Play
