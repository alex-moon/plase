// for testing
navigator.geolocation.getCurrentPosition = function(callback) { return callback({'coords': {'latitude': 10, 'longitude': 10 }}); };
// -----------

function Plase () {
    var plase = {
        // Latitude/longitude spherical geodesy formulae & scripts (c) Chris Veness 2002-2012
        // www.movable-type.co.uk/scripts/latlong.html
        LatLon: function(latitude, longitude) {
            self = this;
            self._radius = 6371;
            self._lat = typeof(latitude)=='number' ? latitude : typeof(latitude)=='string' && latitude.trim()!=='' ? +latitude : NaN;
            self._lon = typeof(longitude)=='number' ? longitude : typeof(longitude)=='string' && longitude.trim()!=='' ? +longitude : NaN;
            self.distanceTo = function(point) {
                precision = 4;
              
                var R = self._radius;
                var lat1 = self._lat.toRad(), lon1 = self._lon.toRad();
                var lat2 = point._lat.toRad(), lon2 = point._lon.toRad();
                var dLat = lat2 - lat1;
                var dLon = lon2 - lon1;

                var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(lat1) * Math.cos(lat2) *
                      Math.sin(dLon/2) * Math.sin(dLon/2);
                var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                var d = R * c;
                return d.toPrecisionFixed(precision);
            };
            self.toString = function() { return Base64.encode('POINT(' + latitude + ' ' + longitude + ')'); };
            return self;
        }
    };

    plase.locate = function() {
        navigator.geolocation.getCurrentPosition(function(position){
            plase.here = plase.LatLon(position.coords.latitude, position.coords.longitude);
            _.delay(plase.locate, 30000);
        });
    };

    // MODELS
    plase.models = {
        Place: Backbone.Model.extend({
            defaults: function() {
                return {
                    'name': '',
                    'listening_to': '',
                    'public': 'yes',
                    'latitude': 0.0,
                    'longitude': 0.0,
                    'plays': []
                };
            },
            distance: function(place) {
                if (place === null) { place = this; }
                var there = plase.LatLon(place.get('latitude'), place.get('longitude'));
                return plase.here.distanceTo(there);
            },
            parse: function(raw_place) {
                var place = _.clone(raw_place);
                _(raw_place.plays).each(function(raw_play, i, list){
                    plase.plays.add(raw_play, {merge: true});
                    place.plays[i] = plase.plays.get(raw_play.id);
                });
                return place;
            }
        }),
        Play: Backbone.Model.extend({
            defaults: function() {
                return {
                    'artist': '',
                    'location': '',
                    'nothing': false,
                    'place': new plase.models.Place()
                };
            },
            parse: function(raw_play) {
                var play = _.clone(raw_play);
                plase.places.add(raw_play.place, {merge: true});
                place = plase.places.get(raw_play.place.id);
                play.place = place;
                return play;
            }
        })
    };

    // COLLECTIONS
    plase.collections = {
        Places: Backbone.Collection.extend({
            model: plase.models.Place,
            url: '/api/plays/place',
            comparator: plase.models.Place.distance
        }),
        Plays: Backbone.Collection.extend({
            model: plase.models.Play,
            url: '/api/plays/play'
        })
    };

    plase.places = new plase.collections.Places();
    plase.plays = new plase.collections.Plays();

    // VIEWS
    plase.views = {
        PlayItemView: Backbone.View.extend({
            tagName: 'li',
            template: _.template($('#play-item-template').html()),
            model: plase.models.Play,
            events: {
                // events
            },
            initialize: function() {
                this.listenTo(this.model, 'change', this.render);
                this.listenTo(this.model, 'destroy', this.remove);
            },
            render: function() {
                this.$el.html(this.template(this.model.toJSON()));
                return this;
            }
        }),
        PlaysListView: Backbone.View.extend({
            el: $('#plays'),
            reportTemplate: _.template($('#report-template').html()),
            collection: plase.plays,
            events: {
                'click #report': 'report'
            },
            initialize: function() {
                this.collection.fetch();
            },
            render: function() {
                // this.$el.html(this.template(this.collection));
            },
            report: function() {
                // do report
            }
        })
    };

    // do initialisation
    plase.locate();
    return plase;
}$(function(){window.plase = new Plase();});