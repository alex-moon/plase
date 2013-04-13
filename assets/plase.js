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
        get: function(attribute) {
            var result = Backbone.Model.prototype.get.call(this, attribute);
            if (attribute == this._fk) {
                var place = plase[this._fk_collection].get(result);
                if (!_(place).isUndefined()) {
                    return place;
                }
            }
            return result;
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
                try {
                    var plays = plase.plays.where({place: this.get('id')});
                    this.set('last_play', _(plays).last());
                } catch (e) {
                    // console.log('missing last_play:', e);
                }
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
            initialize: function() {
                try {
                    var place = plase.places.get(this.get('place'));
                } catch (e) {
                    // console.log('missing place:', e);
                }
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
            render: function(place) {
                $last_play = _(place.get('last_play'));
                if ($last_play.isUndefined() || $last_play.isNumber() || $last_play.value().get('nothing')) {
                    this.$el.hide();
                } else {
                    try {
                        this.$el.html(this.template({'place': place.toJSON(), 'last_play': place.get('last_play').toJSON()}));
                        this.$el.show();
                    } catch (e) {
                        // defer render until we have missing data
                        // console.log('missing data for template:', e.message, place);
                    }
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
        }),
        ReportView: Backbone.View.extend({
            el: $('#report-forms'),
            collection: plase.places,
            events: {
                'submit #add-play': 'submit',
                'show ul.autocomplete': 'autocomplete',
                'click #add-place-button': 'add_place'
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
                            $place.find('#id_name').val(model.get('name')).addClass('set');
                            $place.find('#id_listening_to').val(model.get('listening_to'));
                            $place.find('#id_public').val(model.get('public'));

                            $play.find('#id_place').val(model.get('id'));

                            $place.find('#add-place-button').hide();
                        }
                    });
                });

                // bind click methods
                $el = this.$el;
                $el.find('#nothing-button').click(function(e){
                    $this = $(e.target);
                    if ($this.hasClass('on')) {
                        $this.siblings('#id_nothing').val('');
                        $this.removeClass('on');
                        $this.closest('form').find('#something').slideDown('fast');
                    } else {
                        $this.siblings('#id_nothing').val(true);
                        $this.addClass('on');
                        $this.closest('form').find('#something').slideUp('fast');
                    }
                });
                $('#show-report').click(function(e){
                    $el.slideToggle('fast');
                });
            },
            submit: function(e) {
                e.preventDefault();

                // first save place
                var raw_place = plase.formToObject(this.$('#add-place'));
                var place = this.collection.get(raw_place.id);
                place.save(raw_place);

                // then save play
                var raw_play = plase.formToObject(this.$('#add-play'));
                var play = new plase.plays.model();
                play.save(raw_play);
                this.$el.slideUp('fast');

                // finally reset forms (except last added ID)
                this.$('#something').slideDown('fast');
                this.$('#nothing-button').removeClass('on');
                this.$('#id_nothing').val('');
                this.$('#add-place, #add-play').each(function(i,form){
                    form.reset();
                });

                return false;
            },
            autocomplete: function(e) {
                var $this = this;
                var $name = $this.$('#id_name').val();
                var $list = $(e.target);
                var $last_added = $('#id_id').data('last-added');

                if (! $last_added ) {
                    $('#add-place-button').show();
                    $('#id_name').removeClass('set');
                } else {
                    $('#id_id').val($last_added);
                }
            },
            add_place: function(e) {
                var $this = $(e.target);
                var $name = this.$('#id_name').val();
                var $last_added = this.$('#id_name').data('last-added');

                $this.val('Sending...').attr('disabled', true);

                var place = new this.collection.model();
                place.save('name', $name, {success: function(place){
                    $id = place.get('id');
                    $('#id_id, #id_place').val($id);
                    $('#id_id').data('last-added', $id);
                    $('#id_name').addClass('set');
                    $this.unbind('click').hide();
                }});
            }
        })
    };

    // INITIALISATION
    // ubiquitous transparent location header
    $(document).ajaxSend(function(e, xhr, options) { xhr.setRequestHeader("where", plase.locate()); });
    (function(){
        // bootstrap plays
        plase.plays.fetch();

        // get initial list
        plase.watch = new plase.views.PlacesListView();

        // prep form
        plase.report_view = new plase.views.ReportView();

        // open our websocket
        var ws = new WebSocket('ws://localhost:81/poll/');
        ws.onclose = function(){ console.log('WebSocket closed'); };
        ws.onerror = function(e){ console.log('WebSocket error: ', e); };
        ws.onmessage = function(e){
            var data = $.parseJSON($.parseJSON(e.data));  // @todo: parse twice?? No fucking way.
            // console.log('message!', data);
            if (_(data).has('play')) {
                plase.plays.add(data.play, {'merge': true});
                plase.places.get(data.play.place).set('last_play', data.play.id);
            } else if (_(data).has('place')) {
                plase.places.add(data.place, {'merge': true});
            }
        };
    })();
    return plase;
}$(function(){window.plase = new Plase();});