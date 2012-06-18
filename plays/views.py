from django.shortcuts import render_to_response, redirect
from django.template import RequestContext

from plays.models import Place, Play
from plays import forms

from django.contrib.gis.geos import fromstr

import json

def watch(request):
    return render(request, 'watch.html', {'plays' : Play.objects.filter(nothing=False).order_by('started')})
    
def report(request):
    if request.method == "POST":
        form = forms.PlayForm(request.POST)
        try:
            form.save()
            return redirect('/')
        except ValueError:
            pass
    else:
        form = forms.PlayForm()
    return render(request, 'report.html', {'form' : form})
    
def poll(request, latitude, longitude):
    # todo
    return render(request, 'ajax.html', {'content' : 'not sure' })
    
def autocomplete(request):
    query = request.GET['query']
    results = Place.objects.filter(name__iregex=query)
    suggestions = [result.name for result in results]
    data = [result.id for result in results]
    content = "{query:'%s', suggestions:%s, data:%s}" % (query, json.dumps(suggestions), json.dumps(data))
    return render(request, 'ajax.html', {'content' : content })
    
def render(request, template, bindings={}):
    return render_to_response(template, bindings, context_instance=RequestContext(request))
