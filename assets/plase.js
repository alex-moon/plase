// for testing
navigator.geolocation.getCurrentPosition = function(callback) { return callback({'coords': {'latitude': 10, 'longitude': 10 }}); };
function cheat(latitude, longitude) {
    navigator.geolocation.getCurrentPosition = function(callback) {
        return callback({'coords': {'latitude': latitude, 'longitude': longitude}});
    };
}
// -----------

function Plase () {
    var plase = {
        // Latitude/longitude spherical geodesy formulae & scripts (c) Chris Veness 2002-2012
        // www.movable-type.co.uk/scripts/latlong.html
        LatLon: function(latitude, longitude) {
            self = this;
            self._radius = 6371;
            self._lat = (typeof(latitude)=='number' || typeof(latitude)=='string') ? +latitude : NaN;
            self._lon = (typeof(longitude)=='number' || typeof(longitude)=='string') ? +longitude : NaN;
            self.distanceTo = function(point) {
                var R = self._radius;
                var lat1 = self._lat * Math.PI / 180, lon1 = self._lon * Math.PI / 180;
                var lat2 = point._lat * Math.PI / 180, lon2 = point._lon * Math.PI / 180;
                var dLat = lat2 - lat1;
                var dLon = lon2 - lon1;

                var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(lat1) * Math.cos(lat2) *
                      Math.sin(dLon/2) * Math.sin(dLon/2);
                var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                var d = R * c;
                return d;
            };
            self.toString = function() { return Base64.encode('POINT(' + self._lat + ' ' + self._lon + ')'); };
            return self;
        }
    };

    plase.locate = function() {
        var here = false;
        navigator.geolocation.getCurrentPosition(function(position){
            here = plase.LatLon(position.coords.latitude, position.coords.longitude);
        });
        return here.toString();
    };

    // MODELS
    plase.models = {
        Place: Backbone.Model.extend({
            defaults: function() {
                return {
                    'name': '',
                    'listening_to': '',
                    'public': 'yes',
                    'plays': [],
                    'last_play': ''
                };
            },
            initialize: function() {
                Backbone.Model.prototype.initialize.apply(this, arguments);  // super
                this.view = new plase.views.PlaceItemView({'model': this});
            },
            distance: function(place) {
                if (_(place).isUndefined()) place = this;
                return place.last_play.distance();
            },
            // @todo: implement general hasMany relations
            parse: function(raw_place) {
                var place = _.clone(raw_place);
                _(raw_place.plays).each(function(raw_play, i, list){
                    if (_(raw_place.last_play).isUndefined()) raw_place.last_play = raw_play;
                    plase.plays.add(raw_play, {merge: true});
                    place.plays[i] = plase.plays.get(raw_play.id);
                });
                if (!_(raw_place.last_play).isUndefined()) {
                    plase.plays.add(raw_place.last_play, {merge: true});
                    place.last_play = plase.plays.get(raw_place.last_play.id);
                }
                return place;
            },
            toJSON: function() {
                var raw_place = Backbone.Model.prototype.toJSON.call(this);
                raw_place.last_play = Backbone.Model.prototype.toJSON.call(this.get('last_play'));
                return raw_place;
            }
        }),
        Play: Backbone.Model.extend({
            defaults: function() {
                return {
                    'artist': '',
                    'location': '',
                    'nothing': '',
                    'place': '',
                    'started': ''//now()
                };
            },
            distance: function(play) {
                if (_(play).isUndefined()) play = this;
                return plase.here.distanceTo(play.location);
            },
            // @todo: implement general hasOne relations
            parse: function(raw_play) {
                var play = _.clone(raw_play);
                plase.places.add(raw_play.place, {merge: true});
                place = plase.places.get(raw_play.place.id);
                play.place = place;
                return play;
            },
            toJSON: function() {
                var raw_play = Backbone.Model.prototype.toJSON.call(this);
                raw_play.place = Backbone.Model.prototype.toJSON.call(raw_play.place);
                return raw_play;
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
            url: '/api/plays/play',
            comparator: 'started'
        })
    };

    plase.places = new plase.collections.Places();
    plase.plays = new plase.collections.Plays();

    // VIEWS
    plase.views = {
        PlaceItemView: Backbone.View.extend({
            template: _.template($('#place-item-template').html()),
            events: {
                // events
            },
            initialize: function() {
                this.listenTo(this.model, 'change', this.render);
                this.listenTo(this.model, 'destroy', this.remove);
            },
            render: function() {
                console.log('about to render a place', this.model.toJSON());
                this.$el.html(this.template(this.model.toJSON()));
                return this;
            }
        }),
        PlacesListView: Backbone.View.extend({
            el: $('#watch'),
            reportTemplate: _.template($('#report-template').html()),
            collection: plase.places,
            events: {
                'click #report': 'report'
            },
            initialize: function() {
                this.listenTo(this.collection, 'add', this.drawList);
                this.listenTo(this.collection, 'reset', this.drawList);
                this.collection.fetch();
            },
            drawList: function() {
                this.$el.html('');
                this.collection.each(this.appendItem, this);
            },
            appendItem: function(play) {
                this.$el.append(play.view.render().el);
            },
            report: function() {
                // do report
            }
        })
    };

    // INITIALISATION
    // ubiquitous transparent location header
    $(document).ajaxSend(function(e, xhr, options) { xhr.setRequestHeader("where", plase.locate()); });
    (function(){
        // get initial list
        plase.watch = new plase.views.PlacesListView();

        // open our websocket
        var ws = new WebSocket('ws://localhost:81/poll/');
        ws.onclose = function(){ console.log('WebSocket closed'); };
        ws.onerror = function(e){ console.log('WebSocket error: ', e); };
        ws.onmessage = function(e){
            console.log('message!');
            var raw_play = $.parseJSON($.parseJSON(e.data));  // @todo: parse twice?? No fucking way.

            // swap the foreign key
            raw_place = raw_play.place;
            plase.plays.add(_(raw_play).omit('place'), {'merge': true});
            raw_place.last_play = plase.plays.get(raw_play.id);
            plase.places.add(raw_place, {'merge': true});
        };
    })();
    return plase;
}$(function(){window.plase = new Plase();});