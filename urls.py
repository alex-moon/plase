from django.conf.urls import patterns, include, url
from django.http import HttpResponse
# from django.contrib.gis import admin
# admin.autodiscover()

from google.appengine.api import channel
from google.appengine.ext.db import delete

import logging

import backbone
backbone.autodiscover()

from plays import views
from plays.models import Play, Place, ChannelRecord
from plays.services import PlaseService


def channel_connect(request, *args, **kwargs):
    # @todo this could probably go in the service as well
    # we already have a client ID/token - see plays.views.PlaseView
    short_token = request.POST.get('from', None)
    logging.debug("We have channel connect from %s" % short_token)
    try:
        channel_record = ChannelRecord.all().filter('short_token', short_token)[0]
        logging.debug("Channel token: %s" % channel_record.token)
    except KeyError:
        logging.error("Could not find channel for token %s" % short_token)
        return

    if short_token:
        service = PlaseService()
        plays = Play.all()  # this should be a standard queryset on the model @todo change views to use model queryset
        places = Place.all()  # ditto
        channel.send_message(channel_record.token, service.json_dumps(plays))
        logging.debug("Socket opened - sending %s" % service.json_dumps(list(plays)))
        channel.send_message(channel_record.token, service.json_dumps(places))
        logging.debug("Socket opened - sending %s" % service.json_dumps(list(places)))
    return HttpResponse('')


def channel_disconnect(request, *args, **kwargs):
    short_token = request.POST.get('from', None)
    if short_token:
        delete(ChannelRecord.all().filter('short_token', short_token))
    return HttpResponse('')


urlpatterns = patterns('',
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),
    # url(r'^admin/?', include(admin.site.urls)),
    url(r'^/?$', views.PlaseView.as_view(), name='plase'),
    url(r'connected', channel_connect),
    url(r'disconnected', channel_disconnect),
    url(r'^api/', include(backbone.site.urls)),
)
