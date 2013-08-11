from django.conf.urls import patterns, include, url
# from django.contrib.gis import admin
# admin.autodiscover()

import backbone
backbone.autodiscover()

from plays import views
from plays.models import ChannelRecord


def channel_disconnect(request, *args, **kwargs):
    channel_token = request.POST.get('from', None)
    if channel_token:
        ChannelRecord.get_by_id(channel_token).delete()


urlpatterns = patterns('',
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),
    # url(r'^admin/?', include(admin.site.urls)),
    url(r'^/?$', views.PlaseView.as_view(), name='plase'),
    url(r'^/_ah/channel/disconnected/$', channel_disconnect),
    url(r'^api/', include(backbone.site.urls)),
)
