$(document).ready(function(){report.init();});

var report = {
    latitude : null,
    longitude : null,
    init : function() {
        navigator.geolocation.getCurrentPosition(this.setCoords);
        $('#place-name').autocomplete({
            'serviceUrl' : '/autocomplete/',
            'onSelect' : function(value, data) { $('#place').val(data); },
        });
    },
    setCoords : function(position) {
        console.log(position.coords.longitude);
        this.latitude = position.coords.latitude;
        this.longitude = position.coords.longitude;
        if (this.latitude && this.longitude) {
            $('#latitude').val(this.latitude);
            $('#longitude').val(this.longitude);
        } else {
            $('form#report').replaceWith('<p class="error">This app uses your current location to place what\'s playing on the globe. Please enable geolocation before telling us what\'s playing.</p>');
        }
    }
};
