var start_idx = 169
var map = L.map('map').setView([imgData[169][3], imgData[169][4]], 13);
var myStyle = {
    "color": "red",
    "weight": 5,
    "opacity": 0.65
};


var OpenTopoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
	maxZoom: 17,
	attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
}).addTo(map);

L.polyline(myLines, myStyle).addTo(map)

function markerOnClick(num){
    var parentWin = window.parent;
    parentWin.postMessage(num, "*");
}

var lat = 0;
var lng = 0;
const markers = [];
for (var i = 0; i < imgData.length; i++) {
    lat = imgData[i][3]
    lng = imgData[i][4]
    if (lat != null && lng != null) {
        markers.push(L.marker([lat, lng]));
        markers.at(-1).addTo(map);
        markers.at(-1).id = i;
    }
}

for (var i = 0; i < markers.length; i++) {
    let marker = markers[i]
    marker.on('click', function(e){
        markerOnClick(e.target.id);
    });
}

function fly(event) {
    map.flyTo(event.data);
}
window.addEventListener("message", fly, false);
