var idx = 169;
const markers = [];
var currentMarker;
var map = L.map('map').setView([imgData[idx][3], imgData[idx][4]], 13);

var icon = L.icon({
    iconUrl: 'camera_gr.svg',
    iconSize:     [30, 45], // size of the icon
    iconAnchor:   [12, 24], // point of the icon which will correspond to marker's location
});

var selectedIcon = L.icon({
    iconUrl: 'camera.svg',
    iconSize:     [40, 55], // size of the icon
    iconAnchor:   [12, 24], // point of the icon which will correspond to marker's location
});

var lineStyle = {
    "color": "red",
    "weight": 5,
    "opacity": 0.65
};

var OpenTopoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
	maxZoom: 17,
	attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
}).addTo(map);

L.polyline(myLines, lineStyle).addTo(map)

function markerOnClick(marker){
    markers[idx].setIcon(icon);
    markers[idx].setZIndexOffset(0);
    var parentWin = window.parent;
    parentWin.postMessage(marker.id, "*");
    idx = marker.id;
    markers[idx].setIcon(selectedIcon);
    markers[idx].setZIndexOffset(1000);
}

var lat = 0;
var lng = 0;
for (var i = 0; i < imgData.length; i++) {
    lat = imgData[i][3]
    lng = imgData[i][4]
    if (lat != null && lng != null) {
        markers.push(L.marker([lat, lng], {icon: icon}));
        markers.at(-1).addTo(map);
        markers.at(-1).id = i;
        markers.at(-1).on('click', function(e){
            markerOnClick(e.target);
        });
    }else{
        markers.push(markers.at(-1));
    }

}

for (var i = 0; i < markers.length; i++) {
    let marker = markers[i];
    marker.on('click', function(e){
        markerOnClick(e.target);
    });
}

function fly(event) {
    let latlng = markers[event.data].getLatLng();
    console.log(latlng);
    map.flyTo(latlng);
    markers[idx].setIcon(icon);
    markers[idx].setZIndexOffset(0);
    idx = event.data;
    markers[idx].setIcon(selectedIcon);
    markers[idx].setZIndexOffset(1000);
}

markers[idx].setIcon(selectedIcon);
markers[idx].setZIndexOffset(1000);
window.addEventListener("message", fly, false);
