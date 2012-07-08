$(document).ready(function(){report.init();});

var report = {
    latitude : null,
    longitude : null,
    init : function() {
        navigator.geolocation.getCurrentPosition(this.setCoords);
        $('#place-name').autocomplete({
            'serviceUrl' : '/autocomplete/',
            'onSelect' : function(value, data) { $('#id_place').val(data); },
        });
    },
    setCoords : function(position) {
        this.latitude = position.coords.latitude;
        this.longitude = position.coords.longitude;
        if (this.latitude && this.longitude) {
            $('#id_location').val('POINT(' + this.latitude + ' ' + this.longitude + ')');
            $('#location-warning').remove();
            $('form#report').show();
        } else {
            $('form#report').remove();
        }
    },
    addPlace : function() {
        var placeName = $('#place-name').val();
        $.get('/addPlace/', {'place-name' : placeName}, function(data){
            $('#add-a-place').fadeOut(200, function(){
                $('#place-details').html(data);
                $('#tell-us').slideDown(500);
            });
        });
    },
    toggleNothing: function() {
        var nothing = $('#id_nothing').val();
        if (nothing) {
            $('#id_nothing').val('');
            $('#something').slideDown();
        } else {
            $('#id_nothing').val(true);
            $('#something').slideUp();
        }
        $('#nothing-button').toggleClass('on');
    }
};
