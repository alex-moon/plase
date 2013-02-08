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
            // @todo: implement general hasMany relations
            parse: function(raw_place) {
                var place = _.clone(raw_place);
                _(raw_place.plays).each(function(raw_play, i, list){
                    plase.plays.add(raw_play, {merge: true});
                    place.plays[i] = plase.plays.get(raw_play.id);
                });
                return place;
            },
            toJSON: function() {
                var raw_place = Backbone.Model.prototype.toJSON.call(this);
                _(raw_place.plays).each(function(play, i, list) {
                    raw_place[i] = Backbone.Model.prototype.toJSON.call(play);
                });
                return raw_place;
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
            url: '/api/plays/play'
        })
    };

    plase.places = new plase.collections.Places();
    plase.plays = new plase.collections.Plays();

    // VIEWS
    plase.views = {
        PlayItemView: Backbone.View.extend({
            template: _.template($('#play-item-template').html()),
            events: {
                // events
            },
            initialize: function() {
                this.listenTo(this.model, 'change', this.render);
                this.listenTo(this.model, 'destroy', this.remove);
            },
            render: function() {
                this.$el.html(this.template({'play': this.model.toJSON()}));
                return this;
            }
        }),
        PlaysListView: Backbone.View.extend({
            el: $('#watch'),
            reportTemplate: _.template($('#report-template').html()),
            collection: plase.plays,
            events: {
                'click #report': 'report'
            },
            initialize: function() {
                this.collection.fetch();
                this.listenTo(this.collection, 'add', this.addOne);
                this.listenTo(this.collection, 'reset', this.addAll);
            },
            // @todo: this logic is obviously wrong if a new Play is added for an existing Place
            addOne: function(play) {
                var view = new plase.views.PlayItemView({'model': play});
                this.$el.append(view.render().el);
            },
            addAll: function() {
                $('#geolocation').remove();
                this.collection.each(this.addOne, this);
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
        plase.watch = new plase.views.PlaysListView();

        // open our websocket
        var ws = new WebSocket('ws://localhost:81/poll/');
        ws.onclose = function(){ console.log('WebSocket closed'); };
        ws.onerror = function(e){ console.log('WebSocket error: ', e); };
        ws.onmessage = function(e){
            console.log('message!');
            var raw_play = $.parseJSON($.parseJSON(e.data));  // @todo: parse twice?? No.
            console.log(raw_play);

            // if the new play has an existing place, replace the play
            var place = plase.places.get(raw_play.place.id);
            if (!_(place).isUndefined()) {
                raw_play['place'] = place;
                plase.plays.each(function(play, i, l){
                    if (play.get('place') == place) {
                        play.set(raw_play);
                    }
                });

            // otherwise add the new play
            } else {
                plase.plays.add(raw_play);
            }
        };
    })();
    return plase;
}$(function(){window.plase = new Plase();});