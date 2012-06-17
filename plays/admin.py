from plays.models import Play, Place
from django.contrib.gis import admin

admin.site.register(Play, admin.GeoModelAdmin)
admin.site.register(Place)
