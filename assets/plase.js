function Plase () {
    var plase = {
        // Latitude/longitude spherical geodesy formulae & scripts (c) Chris Veness 2002-2012
        // www.movable-type.co.uk/scripts/latlong.html
        LatLon: function(latitude, longitude) {
            this._radius = 6371;
            this._lat = typeof(lat)=='number' ? lat : typeof(lat)=='string' && lat.trim()!=='' ? +lat : NaN;
            this._lon = typeof(lon)=='number' ? lon : typeof(lon)=='string' && lon.trim()!=='' ? +lon : NaN;
            this.distanceTo = function(point) {
                precision = 4;
              
                var R = this._radius;
                var lat1 = this._lat.toRad(), lon1 = this._lon.toRad();
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
            this.toString = function() { return Base64.encode('POINT(' + latitude + ' ' + longitude + ')'); };
        },
        locate: function() {
            navigator.geolocation.getCurrentPosition(function(position){
                plase.here = plase.LatLon(position.coords.latitude, position.coords.longitude);
                _.delay(plase.locate, 30000);
            });
        },

        // Models
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
                // @todo: does this overwrite the plays list or add to it?
                // @todo: also, we want to ignore this on save
                var place = _.clone(raw_place);
                var plays = _(raw_place.plays).map(function(raw_play, i, list){
                    return plase.plays.add(raw_play, {merge: true});
                });
                place.plays = plays;
                return place;
            }
        }),
        Play: Backbone.Model.extend({
            defaults: function() {
                return {
                    'artist': '',
                    'location': '',
                    'nothing': false,
                    'place': new plase.Place()
                };
            },
            parse: function(raw_play) {
                // @todo: ignore on save
                var play = _.clone(raw_play);
                var place = plase.places.add(raw_play.place, {merge: true});
                play.place = place;
                return play;
            }
        }),
        Places: Backbone.Collection.extend({
            model: plase.Place,
            url: '/places',
            comparator: Place.distance
        }),
        Plays: Backbone.Collection.extend({
            model: plase.Play,
            url: '/plays'
        }),
        places: new plase.Places(),
        plays: new plase.Plays(),
        PlayItemView: Backbone.View.extend({
            tagName: 'li',
            template: _.template($('#play-item-template').html()),
            model: plase.Play,
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
}

var app = new Plase();
