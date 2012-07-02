$(document).ready(function(){watch.init();});

var watch = {
    init : function() {
        this.poll()
        setInterval(watch.poll, 1000);
    },
    poll : function() {
        navigator.geolocation.getCurrentPosition(watch.getList);
    },
    getList : function(position) {
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        if (latitude && longitude) {
            where = Base64.encode('POINT(' + latitude + ' ' + longitude + ')');
console.log(where);
            $.get('/poll/', { 'where' : where }, function(data){
                $('#watch').html(data);
            });
        }
    }
};
