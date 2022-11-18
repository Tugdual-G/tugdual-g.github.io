var btn = document.getElementById("btn");
var idx = 169;
var prvs = document.getElementById("previous");
var nxt = document.getElementById("next");
document.getElementById("slide").src = "mini/" + imgData[idx][1];

function sendCoord(idx) {
    var iframeWin = document.getElementById("cailleframe").contentWindow;
    iframeWin.postMessage(idx, "*");
}

function updateInfos(idx) {
    var infos = document.getElementById("infos");
    infos.textContent=`elevation: ${imgData[idx][5].toFixed(0)}m, date: ${imgData[idx][0]}`;


}

function ChangeSlide(sens) {
    idx = idx + sens;
    if (idx < 0)
        idx = imgData.length - 1;
    if (idx > imgData.length - 1)
        idx = 0;
    document.getElementById("slide").src = "mini/" + imgData[idx][1];
    sendCoord(idx);
    updateInfos(idx);
}

function flyToDiapo(event){
    idx = event.data;
    document.getElementById("slide").src = "mini/" + imgData[idx][1];
    scroll(0,0);
    sendCoord(idx);
}

updateInfos(idx);
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
