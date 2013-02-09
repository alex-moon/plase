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

    // extensible model with foreign key field
    PlaseModel = Backbone.Model.extend({
        get: function(attribute) {
            var result = Backbone.Model.prototype.get.call(this, attribute);
            return attribute != this._fk ? result : plase[this._fk_collection].get(result);
        },
        toJSON: function() {
            var data = Backbone.Model.prototype.toJSON.call(this);
            data[this._fk] = Backbone.Model.prototype.toJSON.call(this.get(this._fk));
            return data;
        },
        parse: function(response) {
            var super_parse = Backbone.Model.prototype.parse;
            if (!_(response[this._fk]).isUndefined()) {
                plase[this._fk_collection].add(response[this._fk], {'merge': true});
            }
            return super_parse.call(this, response[this._model_name]);
        }
    });

    // MODELS
    plase.models = {
        Place: PlaseModel.extend({
            _fk: 'last_play',
            _fk_collection: 'plays',
            _model_name: 'place',
            defaults: function() {
                return {
                    'name': '',
                    'listening_to': '',
                    'public': 'yes',
                    'last_play': ''
                };
            },
            initialize: function() {
                Backbone.Model.prototype.initialize.apply(this, arguments);  // super
                this.view = new plase.views.PlaceItemView({'model': this});
            },
            distance: function(place) {
                if (_(place).isUndefined()) place = this;
                return place.get('last_play').distance();
            }
        }),
        Play: PlaseModel.extend({
            _fk: 'place',
            _fk_collection: 'places',
            _model_name: 'play',
            defaults: function() {
                return {
                    'artist': '',
                    'location': '', // LatLon
                    'nothing': '',
                    'place': '',
                    'started': '' //now()
                };
            },
            distance: function(play) {
                if (_(play).isUndefined()) play = this;
                return plase.here.distanceTo(play.location);
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
                console.log('trying to render', this.model.toJSON());
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
            var data = $.parseJSON($.parseJSON(e.data));  // @todo: parse twice?? No fucking way.
            plase.plays.add(data.play, {'merge': true});
            plase.places.add(data.place, {'merge': true});
        };
    })();
    return plase;
}$(function(){window.plase = new Plase();});