from django.conf.urls import patterns, include, url

# Uncomment the next two lines to enable the admin:
from django.contrib.gis import admin
admin.autodiscover()

urlpatterns = patterns('',
    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),
    url(r'^admin/?', include(admin.site.urls)),
    url(r'^/?$', 'plays.views.watch'),
    url(r'^report/?$', 'plays.views.report'),
    url(r'^autocomplete/?', 'plays.views.autocomplete'),
    url(r'^addPlace/?', 'plays.views.addPlace'),
    url(r'^poll/?', 'plays.views.poll'),
)
