from django.shortcuts import render_to_response
from django.template import RequestContext
from django.views.generic import TemplateView, FormView
from plays.models import Place
from plays import forms

from plays.forms import PlayForm, PlaceForm


class PlaseView(TemplateView):
    template_name = 'base.html'

    def get_context_data(self, *args, **kwargs):
        context = super(PlaseView, self).get_context_data(*args, **kwargs)
        context['play_form'] = PlayForm()
        context['place_form'] = PlaceForm()
        return context


class ReportView(FormView):
    template_name = 'report.html'
    form_class = forms.PlayForm
    success_url = '/'

    def post(self, request, *args, **kwargs):
        # if we have a Place form, save that first
        if 'summary' in request.POST:
            place = Place.objects.get(id=request.POST['place'])
            place_form = forms.PlaceForm(request.POST, instance=place)
            if place_form.is_valid():
                place_form.save()
            else:
                kwargs.update({'place_form': place_form})

        return super(ReportView, self).post(request, *args, **kwargs)

    def form_valid(self, form):
        self.instance = form.save()
        return super(ReportView, self).form_valid(form)


class AddPlaceView(FormView):
    template_name = 'addPlace.html'
    form_class = forms.PlaceForm

    def get_form(self, form_class):
        # by name instead of by pk
        place, created = Place.objects.get_or_create(name=self.request.GET['place-name'])
        return self.form_class(instance=place, **self.get_form_kwargs())


def autocomplete(request):
    query = request.GET['query']
    results = Place.objects.filter(name__iregex=query)
    suggestions = [result.name for result in results]
    data = [result.id for result in results]
    content = "{query:'%s', suggestions:%s, data:%s}" % (query, json.dumps(suggestions), json.dumps(data))
    return render_to_response('ajax.html', {'content': content}, context_instance=RequestContext(request))
