from django.views.generic import TemplateView
from plays.forms import PlayForm, PlaceForm


class PlaseView(TemplateView):
    template_name = 'base.html'

    def get_context_data(self, *args, **kwargs):
        context = super(PlaseView, self).get_context_data(*args, **kwargs)
        context['play_form'] = PlayForm()
        context['place_form'] = PlaceForm()
        return context
