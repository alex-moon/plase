from uuid import uuid4
from google.appengine.api import channel
from django.views.generic import TemplateView
from plays.forms import PlayForm, PlaceForm
from plays.models import ChannelRecord


class PlaseView(TemplateView):
    template_name = 'base.html'

    def get_context_data(self, *args, **kwargs):
        context = super(PlaseView, self).get_context_data(*args, **kwargs)

        short_token = str(uuid4())
        channel_token = channel.create_channel(short_token)
        channel_record = ChannelRecord(token=channel_token)
        channel_record.short_token = short_token
        channel_record.save()

        context['channel_token'] = channel_token
        context['play_form'] = PlayForm()
        context['place_form'] = PlaceForm()
        return context

