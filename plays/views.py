from django.shortcuts import render_to_response, redirect
from django.template import RequestContext
from django.db.models.aggregates import Max
from django.db.models import F
from plays.models import Place, Play
from plays import forms
from base64 import b64decode

from django.contrib.gis.geos import fromstr

import json

def watch(request):
    return render(request, 'watch.html')
    
def poll(request):
    where = request.GET['where']
    here = fromstr(b64decode(where))
    plays = Play.objects.filter(nothing=False).annotate(max_started=Max('place__play__started')).filter(started=F('max_started')).distance(here).order_by('distance')
    return render(request, 'poll.html', {'plays' : plays})
    
def report(request):
    if request.method == "POST":
        if 'summary' in request.POST:
            place = Place.objects.get(id=request.POST['place'])
            place_form = forms.PlaceForm(request.POST, instance=place)
            try:
                place_form.save()
            except ValueError:
                pass
        form = forms.PlayForm(request.POST)
        try:
            form.save()
            return redirect('/')
        except ValueError:
            pass
    else:
        form = forms.PlayForm()
        place_form = None
    return render(request, 'report.html', {'form' : form, 'place_form' : place_form})
    
def addPlace(request):
    place_name = request.GET['place-name']
    places = Place.objects.filter(name=place_name)
    if not places:
        place = Place()
        place.name = place_name
        place.save()
    else:
        place = places[0]
    id = place.id
    form = forms.PlaceForm(instance=place)
    return render(request, 'addPlace.html', {'id' : id, 'form' : form})
    
def autocomplete(request):
    query = request.GET['query']
    results = Place.objects.filter(name__iregex=query)
    suggestions = [result.name for result in results]
    data = [result.id for result in results]
    content = "{query:'%s', suggestions:%s, data:%s}" % (query, json.dumps(suggestions), json.dumps(data))
    return render(request, 'ajax.html', {'content' : content })
    
def render(request, template, bindings={}):
    return render_to_response(template, bindings, context_instance=RequestContext(request))
