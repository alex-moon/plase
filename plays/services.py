from django.utils import simplejson
from django.core.serializers.json import DjangoJSONEncoder

from google.appengine.ext.db import Query

from plays.models import Place, Play

class PlaseService(object):
    PLACE_DISPLAY_FIELDS = ('id', 'name', 'listening_to', 'public')
    PLAY_DISPLAY_FIELDS = ('id', 'artist', 'title', 'started', 'nothing')

    def json_dumps(self, data, **options):
        if not isinstance(data, list) and not isinstance(data, Query):
            data = [data]
        message = {}
        for obj in data:
            if isinstance(obj, Play):
                if 'plays' not in message:
                    message = {'plays': [self.serialize(obj)]}
                else:
                    message['plays'].append(self.serialize(obj))
            if isinstance(obj, Place):
                if 'places' not in message:
                    message = {'places': [self.serialize(obj)]}
                else:
                    message['places'].append(self.serialize(obj))

        # we now have our JSON-serializable object to send to the frontend
        params = {'sort_keys': True, 'indent': 2}
        params.update(options)
        # This code is based off django's built in JSON serializer
        if simplejson.__version__.split('.') >= ['2', '1', '3']:
            # Use JS strings to represent Python Decimal instances (ticket #16850)
            params.update({'use_decimal': False})
        return simplejson.dumps(message, cls=DjangoJSONEncoder, **params)

    def serialize(self, obj, fields=None):
        """
        Serializes a single model instance to a Python object, based on the specified list of fields.
        """
        if fields is None:
            if isinstance(obj, Play):
                fields = self.PLAY_DISPLAY_FIELDS
            elif isinstance(obj, Place):
                fields = self.PLACE_DISPLAY_FIELDS
            else:
                fields = obj.fields().keys()

        data = obj.__dict__['_entity']  # @todo: obj.properties()?
        for key in data.keys():
            if key not in fields:
                del data[key]

        # For any fields that are not actual db fields (perhaps a property), we will manually add it
        non_db_fields = set(fields) - set(data.keys())
        for field in non_db_fields:
            if field == 'id':
                data[field] = str(obj.key())
            else:
                attr = getattr(obj, field)
                if callable(attr):
                    data[field] = attr()
                else:
                    data[field] = attr

        if isinstance(obj, Play):
            #data['latitude'] = obj.location.get_y()
            #data['longitude'] = obj.location.get_x()
            try:
                data['place'] = str(obj.place.key())
            except:
                data['place'] = obj.place

        return data