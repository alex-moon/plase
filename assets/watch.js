$(document).ready(function(){watch.init();});

var watch = {
    init : function() {
        navigator.geolocation.getCurrentPosition(watch.getInitial);
    },
    getInitial : function(position) {
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        if (latitude && longitude) {
            where = Base64.encode('POINT(' + latitude + ' ' + longitude + ')');
            $.get('/initial/', { 'where' : where }, function(data){
                $('#watch').html(data);
            });
        }
        watch.poll();
    },
    poll : function() {
        navigator.geolocation.getCurrentPosition(watch.getUpdates);
    },
    getUpdates : function(position) {
        console.log('Opening websocket');
        watch.ws = new WebSocket('ws://localhost:81/poll/');
        watch.ws.onopen = function(){
            console.log('WebSocket connected');
        };
        watch.ws.onmessage = function(e){
            console.log(e.data);
        };
        watch.ws.onclose = function(){
            console.log('WebSocket closed');
        };
        watch.ws.onerror = function(e){
            console.log('Error: ', e);
        };
    }
};
