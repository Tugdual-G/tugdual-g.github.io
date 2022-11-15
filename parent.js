var btn = document.getElementById("btn");
var idx = 169;
var prvs = document.getElementById("previous");
var nxt = document.getElementById("next");
document.getElementById("slide").src = "mini/" + imgData[idx][1];

function sendCoord(lat, lng) {
    var iframeWin = document.getElementById("cailleframe").contentWindow;
    iframeWin.postMessage([lat, lng], "*");
}

function ChangeSlide(sens) {
    idx = idx + sens;
    if (idx < 0)
        idx = imgData.length - 1;
    if (idx > imgData.length - 1)
        idx = 0;
    document.getElementById("slide").src = "mini/" + imgData[idx][1];
    sendCoord(imgData[idx][3], imgData[idx][4]);
}

function flyToDiapo(event){
    idx = event.data;
    document.getElementById("slide").src = "mini/" + imgData[idx][1];
}

prvs.onclick = function(){ChangeSlide(-1);};
nxt.onclick = function(){ChangeSlide(1);};

window.addEventListener("message", flyToDiapo, false);

document.addEventListener("keydown", (event) => {
    // Left
    if (event.keyCode === 37) {
        ChangeSlide(-1);
        return;
    }

    // Right
    if (event.keyCode === 39) {
        ChangeSlide(1);
        return;
    }
  // do something
});
