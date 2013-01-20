from django.shortcuts import render_to_response, redirect
from django.template import RequestContext
from django.db.models.aggregates import Max
from django.db.models import F
from django.views.generic import TemplateView, FormView
from django.http import HttpResponse

from plays.models import Place, Play
from plays import forms
from base64 import b64decode

from django.contrib.gis.geos import fromstr

import json
import pika


class WatchView(TemplateView):
    template_name = 'watch.html'


class InitialView(TemplateView):
    template_name = 'initial.html'

    def get_context_data(self, *args, **kwargs):
        context = super(InitialView, self).get_context_data(*args, **kwargs)
        where = self.request.GET['where']
        here = fromstr(b64decode(where))
        context['plays'] = Play.objects.filter(nothing=False).annotate(max_started=Max('place__play__started')).filter(started=F('max_started')).distance(here).order_by('distance')
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
        data = form.cleaned_data

        data['location'] = [x for x in data['location']]
        data['place'] = data['place'].name

        connect = pika.BlockingConnection()
        channel = connect.channel()
        # channel.queue_declare(queue='plase', durable=True)
        channel.basic_publish(exchange='', routing_key='plase', body=json.dumps(data))
        connect.close()

        return super(ReportView, self).form_valid(form)


class AddPlaceView(FormView):
    template_name = 'addPlace.html'
    form_class = forms.PlaceForm

    def get_form(self, form_class):
        # by name instead of by pk
        place = Place.objects.get_or_create(name=self.request.GET['place-name'])
        return self.form_class(instance=place, **self.get_form_kwargs())


def autocomplete(request):
    query = request.GET['query']
    results = Place.objects.filter(name__iregex=query)
    suggestions = [result.name for result in results]
    data = [result.id for result in results]
    content = "{query:'%s', suggestions:%s, data:%s}" % (query, json.dumps(suggestions), json.dumps(data))
    return render_to_response('ajax.html', {'content': content}, context_instance=RequestContext(request))
