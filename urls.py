from django.conf.urls import patterns, include, url
from django.contrib.gis import admin
admin.autodiscover()

import backbone
backbone.autodiscover()

from plays import views

urlpatterns = patterns('',
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),
    url(r'^admin/?', include(admin.site.urls)),
    url(r'^/?$', views.WatchView.as_view(), name='watch'),
    url(r'^report/?$', views.ReportView.as_view(), name='report'),
    url(r'^initial/?$', views.InitialView.as_view(), name='initial'),
    url(r'^addPlace/?', views.AddPlaceView.as_view(), name='addPlace'),
    url(r'^autocomplete/?', 'plays.views.autocomplete'),
    url(r'^api/', include(backbone.site.urls)),
)
