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
        },
        // we shouldn't need to define this but here it is
        formToObject: function(form) {
            var $form = $(form);
            var result = $form.serializeArray();
            result = _(result).map(function(o){
                return [o.name, o.value];
            });
            return _(result).object();
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
        attach: function(raw_data) {
            // register a related model prior to save (i.e. before we have a PK)
            this._attached = raw_data;
        },
        get: function(attribute) {
            var result = Backbone.Model.prototype.get.call(this, attribute);
            return attribute != this._fk ? result : plase[this._fk_collection].get(result);
        },
        toJSON: function() {
            // we keep these flat for consistency's sake.
            var data = {};
            data[this._model_name] = Backbone.Model.prototype.toJSON.call(this);
            data[this._fk] = this._attached ? this._attached : Backbone.Model.prototype.toJSON.call(this.get(this._fk));
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
            urlRoot: '/api/plays/place',
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
            urlRoot: '/api/plays/play',
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
            render: function(data) {
                if (!_(data._model_name).isUndefined()) {
                    data = this.model.toJSON(data);
                } try {
                    this.$el.html(this.template(data));
                } catch (e) {
                    // defer render until we have missing data
                    // console.log('missing data for template:', e.message, data);
                }
                return this;
            }
        }),
        PlacesListView: Backbone.View.extend({
            el: $('#watch'),
            collection: plase.places,
            events: {
                // events
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
            appendItem: function(place) {
                this.$el.append(place.view.render(place).el);
            }
        }),/*
        PlayReportView: Backbone.View.extend({
            el: $('#add-play'),
            collection: plase.plays,
            events: {
                'submit': 'submit'
            },
            submit: function(e) {
                e.preventDefault();
                var raw_play = plase.formToObject(e.target);
                var play = new this.collection.model(raw_play);
                play.save();
                // this.$el.slideUp('fast');
            }
        }),*/
        ReportView: Backbone.View.extend({
            el: $('#report-forms'),
            collection: plase.places,
            events: {
                'submit #add-play': 'submit'
            },
            initialize: function() {
                var $place = this.$('#add-place');
                var $play = this.$('#add-play');
                this.listenTo(this.collection, 'reset', function(){
                    $place.find('#id_name').autocomplete({
                        collection: this.collection,
                        attr: 'name',
                        noCase: true,
                        onselect: function(model) {
                            $place.find('#id_id').val(model.get('id'));
                            $place.find('#id_name').val(model.get('name'));
                            $place.find('#id_listening_to').val(model.get('listening_to'));
                            $place.find('#id_public').val(model.get('public'));
                            $play.find('#id_place').val(model.get('id'));
                        }
                    });
                });
            },
            submit: function(e) {
                e.preventDefault();

                // first save place
                var raw_place = plase.formToObject(this.$('#add-place'));
                var raw_play = plase.formToObject(this.$('#add-play'));
                delete(raw_place.id);
                delete(raw_play.id);
                var place = new this.collection.model(raw_place);
                console.log('This is a new place', place);
                place.attach(raw_play);
                place.save(raw_place);
                this.$el.slideUp('fast');
            }
        }),
    };

    // INITIALISATION
    // ubiquitous transparent location header
    $(document).ajaxSend(function(e, xhr, options) { xhr.setRequestHeader("where", plase.locate()); });
    (function(){
        // get initial list
        plase.watch = new plase.views.PlacesListView();

        //plase.add_play = new plase.views.PlayReportView();
        //plase.add_place = new plase.views.PlaceReportView();
        //plase.add_play.$el.submit(function(){plase.add_place.$el.submit();}); // probably a nicer way to do this...
        plase.add_place_play = new plase.views.ReportView();

        // open our websocket
        var ws = new WebSocket('ws://localhost:81/poll/');
        ws.onclose = function(){ console.log('WebSocket closed'); };
        ws.onerror = function(e){ console.log('WebSocket error: ', e); };
        ws.onmessage = function(e){
            var data = $.parseJSON($.parseJSON(e.data));  // @todo: parse twice?? No fucking way.
            console.log('message!', data);
            plase.plays.add(data.last_play, {'merge': true, 'silent': true});
            plase.places.add(data.place, {'merge': true, 'silent': true});
            plase.places.get(data.place.id).view.render(data);
        };
    })();
    return plase;
}$(function(){window.plase = new Plase();});