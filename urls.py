from django.conf.urls import patterns, include, url
# from django.contrib.gis import admin
# admin.autodiscover()

import backbone
backbone.autodiscover()

from plays import views

urlpatterns = patterns('',
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),
    # url(r'^admin/?', include(admin.site.urls)),
    url(r'^/?$', views.PlaseView.as_view(), name='plase'),
    url(r'^api/', include(backbone.site.urls)),
)
