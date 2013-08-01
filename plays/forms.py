from django import forms
from plays.models import Place, Play
# from django.contrib.gis.forms.fields import GeometryField


class PlayForm(forms.ModelForm):
    place = forms.ModelChoiceField(queryset=Place.objects.all(), widget=forms.HiddenInput)
    # location = GeometryField(widget=forms.HiddenInput)
    nothing = forms.BooleanField(widget=forms.HiddenInput)

    def clean(self):
        cleaned_data = super(PlayForm, self).clean()

        nothing = cleaned_data.get("nothing")
        artist = cleaned_data.get("artist")
        title = cleaned_data.get("title")

        if nothing:
            del cleaned_data["artist"]
            del cleaned_data["title"]
            cleaned_data["nothing"] = True  # normalise for consistency's sake

        else:
            del self._errors["nothing"]  # 'False' != False (shakes fist at HiddenInput)
            cleaned_data["nothing"] = False

            msg = u"This field is required"
            if not artist:
                self._errors["artist"] = self.error_class([msg])
            if not title:
                self._errors["title"] = self.error_class([msg])

        return cleaned_data

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
