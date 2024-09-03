"use strict";
import { createIcoProgram, createSelectProgram } from "./shaderPrograms.js"
import { Quaternion, rotationQuaternion } from "./quaternions.js"

const faceToTheme = new Map();
faceToTheme.set(0, "");
// faceToTheme.set(1, "empty");
faceToTheme.set(2, "cv");
faceToTheme.set(3, "waves");
// faceToTheme.set(4, "empty");
// faceToTheme.set(5, "empty");
faceToTheme.set(9, "about");
faceToTheme.set(6, "trees");
faceToTheme.set(7, "linux");
faceToTheme.set(12, "bike");
faceToTheme.set(13, "code");
faceToTheme.set(14, "spoons");
faceToTheme.set(17, "mathsPhysics");
faceToTheme.set(19, "sewing");

const faceToQuat = new Map();
faceToQuat.set(0, [ -0.2632948160171509, -0.8156597018241882, 0.05183764919638634, -0.25364285707473755 ]);
faceToQuat.set(1, [ 0.868914783000946, 0.010217682458460331, -0.1519174724817276, -0.15255436301231384 ]);
faceToQuat.set(2,  [ -0.7306313514709473, 0.3647196292877197, -0.19296707212924957, 0.42189446091651917 ]);
faceToQuat.set(3, [ 0.019788552075624466, -0.6353718042373657, -0.3843146860599518, -0.504227876663208 ]);
faceToQuat.set(4, [ -0.31990063190460205, 0.4686611294746399, 0.7205129265785217, -0.2146582007408142 ]);
faceToQuat.set(5, [ -0.6156808733940125, -0.06606721878051758, 0.6141132116317749, -0.2152601182460785 ]);
faceToQuat.set(6, [ -0.6449180245399475, 0.21630069613456726, 0.6409308910369873, 0.1172584816813469 ]);
faceToQuat.set(7, [ -0.805505633354187, 0.2857809066772461, 0.2967551648616791, 0.25658151507377625 ]);
faceToQuat.set(8,  [ 0.7286338806152344, -0.4514775574207306, -0.17427583038806915, -0.15438498556613922 ]);
faceToQuat.set(9, [ 0.32906997203826904, -0.42198479175567627, -0.5955416560173035, -0.46342310309410095 ]);
faceToQuat.set(10, [ -0.453665167093277, 0.2709401249885559, 0.7761552929878235, 0.09751682728528976 ]);
faceToQuat.set(11, [ -0.7586727142333984, 0.031321506947278976, -0.08594036847352982, 0.4751448333263397 ]);
faceToQuat.set(12, [ -0.15740399062633514, -0.40496015548706055, -0.19027447700500488, 0.8046911954879761 ]);
faceToQuat.set(13, [ -0.19778423011302948, 0.3824578821659088, 0.751007080078125, -0.3697231709957123 ]);
faceToQuat.set(14, [ 0.10007303953170776, 0.04037787765264511, 0.911658763885498, 0.03205632418394089 ]);
faceToQuat.set(15, [ 0.48557230830192566, 0.23032528162002563, 0.5914286971092224, 0.37832409143447876 ]);
faceToQuat.set(16, [ 0.4910920560359955, 0.4042074382305145, 0.5893021821975708, 0.17473021149635315 ]);
faceToQuat.set(17, [ -0.4248988926410675, 0.0891469344496727, -0.38210350275039673, 0.7348645329475403 ]);
faceToQuat.set(18, [ -0.5394981503486633, -0.40847986936569214, -0.35030096769332886, 0.4757739007472992 ]);
faceToQuat.set(19, [ 0.053100358694791794, 0.14549708366394043, 0.7960253953933716, -0.43381041288375854 ]);

const themeToFace = new Map(Array.from(faceToTheme, a => a.reverse()))

let old_pos = {
    x:-1.0,
    y:-1.0,
};

let selectionCoord = new Uint8Array(4);
let selectedFace = 20;

function getCursorPosition(event, target) {
    target = target || event.target;
    var rect = target.getBoundingClientRect();

    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
    }
}

function getCanvasCursorPosition(event, target) {
    target = target || event.target;
    var pos = getCursorPosition(event, target);

    pos.x = 2.0 * pos.x / target.clientWidth - 1.0;
    pos.y = 1.0 - 2.0 * pos.y / target.clientHeight;
    return pos;
}

function faceNormal(face, vertices){
    let normal = [0.0, 0.0, 0.0];
    let vertIdx = 0;
    for (let i = 0; i < 3; ++i){
        for (let j = 0; j < 3; ++j){
            normal[j] += vertices[face[i]][j];
        }
    }

    let norm = normal[0]*normal[0] + normal[1]*normal[1] + normal[2]*normal[2];
    norm = Math.pow(norm, 0.5);

    return normal.map((x) => x/norm);
}

function createIcoVertices(){
    const PHI = 1.6180339887498;

    let vertices = [
        [-1, PHI, 0],
        [1, PHI, 0],
        [-1, -PHI, 0],
        [1, -PHI, 0],
        [0, -1, PHI],
        [0, 1, PHI],
        [0, -1, -PHI],
        [0, 1, -PHI],
        [PHI, 0, -1],
        [PHI, 0, 1],
        [-PHI, 0, -1],
        [-PHI, 0, 1],
    ];
    for (let i = 0; i < 12; ++i){
        for (let j = 0; j < 3; ++j){
            vertices[i][j] *= 0.5;
        }
    }

    let faces = [
        [0, 11, 5],
        [0, 5, 1],
        [0, 1, 7],
        [0, 7, 10],
        [0, 10, 11],
        [11, 10, 2],
        [5, 11, 4],
        [1, 5, 9],
        [7, 1, 8],
        [10, 7, 6],
        [3, 9, 4],
        [3, 4, 2],
        [3, 2, 6],
        [3, 6, 8],
        [3, 8, 9],
        [9, 8, 1],
        [4, 9, 5],
        [2, 4, 11],
        [6, 2, 10],
        [8, 6, 7],
    ];


    let verticeAttrs = new Float32Array(20 * 3 * 8);
    let vertIdx = 0;
    let normal = [0.0, 0.0, 0.0];
    let texCoordUneven = [[0.0,0.0],[1.0,0.0],[0.5, 1.0]]
    let texCoordEven = [[-0.5,1.0],[0.0,0.0],[0.5, 1.0]];

    for (let i = 0; i < 20; ++i){
        normal = faceNormal(faces[i], vertices);
        for (let j = 0; j < 3; ++j){
            vertIdx = faces[i][j];
            verticeAttrs[i * 24 + j * 8] = vertices[vertIdx][0];
            verticeAttrs[i * 24 + j * 8 + 1] = vertices[vertIdx][1];
            verticeAttrs[i * 24 + j * 8 + 2] = vertices[vertIdx][2];
            verticeAttrs[i * 24 + j * 8 + 3] = normal[0];
            verticeAttrs[i * 24 + j * 8 + 4] = normal[1];
            verticeAttrs[i * 24 + j * 8 + 5] = normal[2];
            if (i % 2 == 0){
                verticeAttrs[i * 24 + j * 8 + 6] = 1.0 -(texCoordEven[j][0] + Math.floor(i/2))/10.0;
                verticeAttrs[i * 24 + j * 8 + 7] = 1.0 - texCoordEven[j][1];

            } else {
                verticeAttrs[i * 24 + j * 8 + 6] = 1.0 -(texCoordUneven[j][0] + Math.floor(i/2))/10.0;
                verticeAttrs[i * 24 + j * 8 + 7] = 1.0 -texCoordUneven[j][1];
            }
        }
    }
    return verticeAttrs;
}

function loadVerticeData(gl, verticeAttrs, attribLocs){


    let positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, verticeAttrs, gl.STATIC_DRAW);

    let vao = gl.createVertexArray();

    gl.bindVertexArray(vao);

    let type = gl.FLOAT;
    let normalize = false;
    let stride = 8 * 4;

    gl.enableVertexAttribArray(attribLocs.vertices.loc);

    {
        let size = 3;
        let offset = 0;
        gl.vertexAttribPointer(
            attribLocs.vertices.loc, size, type, normalize, stride, offset);
    }

    gl.enableVertexAttribArray(attribLocs.normals.loc);

    {
        let size = 3;
        let offset = 3 * 4;
        gl.vertexAttribPointer(
            attribLocs.normals.loc, size, type, normalize, stride, offset);
    }

    gl.enableVertexAttribArray(attribLocs.texCoords.loc);

    {
        let size = 2;
        let offset = 6 * 4;
        gl.vertexAttribPointer(
            attribLocs.texCoords.loc, size, type, normalize, stride, offset);
    }

    let verticeAttrObject = {
        VAO:vao,
        VBO:positionBuffer,
    }
    return verticeAttrObject;

}

function addImageTexture(gl, imageSource){

    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Fill the texture with a 1x1 blue pixel.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 1, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE,
                  new Uint8Array([0]));

    // Asynchronously load an image
    var image = new Image();
    image.src = imageSource;
    image.addEventListener('load', function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE,gl.UNSIGNED_BYTE, image);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        gl.generateMipmap(gl.TEXTURE_2D);

    });
    return texture;
}

function getFaceFromTexCoord(texCoord){
    let x = (texCoord[0] / 255.0) * 10.0;
    let y = (1.0 - texCoord[1] / 255.0);

    let face = Math.floor(x);
    let r = x - face;
    face *= 2.0;

    if (r < 0.5){
        if (y < 2.0 * r ){
            face += 1;
        }
    }else {
        if ( y > (2.0 - 2.0 * r) ){
            face += 2;
        } else {
            face += 1;
        }
    }
    return face % 20;
}

function handleClickOnFace(face){
    console.log(face);
    let icoTheme = document.getElementById("icoTheme");
    switch (face){
        case 0:
            break;
        case 3:
            window.location.href = "waves.html" ;
            break;
        default:
            if (faceToTheme.has(face)){
                window.location.hash = "#!" + faceToTheme.get(face);
                goToHash();
                icoTheme.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
            }
            break;

    }
}

function setFramebufferAttachmentSizes(gl, width, height, texture, depthBuffer) {
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const level = 0;
    const internalFormat = gl.RGBA;
    const border = 0;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;
    const data = null;
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                width, height, border,
                format, type, data);

    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
}

function drawSelectedFace(gl, selectionProgramOb, q, q_inv){
    gl.bindFramebuffer(gl.FRAMEBUFFER, selectionProgramOb.fb);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, 1, 1);
    gl.useProgram(selectionProgramOb.program);
    gl.uniform4f(selectionProgramOb.uniformLocations.q, q.q[0], q.q[1], q.q[2], q.q[3]);
    gl.uniform4f(selectionProgramOb.uniformLocations.q_inv, q_inv.q[0], q_inv.q[1], q_inv.q[2], q_inv.q[3]);
    gl.uniform2f(selectionProgramOb.uniformLocations.cursorCoord, old_pos.x, old_pos.y);
    gl.drawArrays(gl.TRIANGLES, 0, selectionProgramOb.nvertices);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
}

function goToFaceLink(gl, selectionProgramOb, q, q_inv){
    drawSelectedFace(gl, selectionProgramOb, q, q_inv);
    gl.bindFramebuffer(gl.FRAMEBUFFER, selectionProgramOb.fb);
    gl.readPixels( 0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, selectionCoord);
    selectedFace = getFaceFromTexCoord(selectionCoord);
    handleClickOnFace(selectedFace);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function initSmootRotation(rotationObj, face, q_from){
    if (faceToQuat.has(face)){
        let faceQuat = new Quaternion(faceToQuat.get(face));

        faceQuat = faceQuat.mult(q_from.inv()).normalize();

        let alpha = 2.0 * Math.acos(faceQuat.q[0]);

        rotationObj.d_alpha = alpha / rotationObj.maxFrames;

        let axis = [faceQuat.q[1], faceQuat.q[2], faceQuat.q[3]];
        let norm = Math.sqrt(axis[0]*axis[0] + axis[1]*axis[1] + axis[2]*axis[2]);
        rotationObj.axis = axis.map((x) => x / norm);
        rotationObj.frame = 0;
    }
}

function randomRoll(rotationObj, q){
    initSmootRotation(rotationObj, Date.now()%19, q);
    rotationObj.d_alpha += (rotationObj.d_alpha * rotationObj.maxFrames + 2.0 * 3.14159);
    rotationObj.maxFrames = 100;
    rotationObj.d_alpha /= rotationObj.maxFrames;
}

function clickOnMenu(event, q, rotationObj){
    const target = event.target;
    let face = -1;
    if (target.className === "menu-item") {
        const action = target.getAttribute("action");
        if (themeToFace.has(action)){
            face = themeToFace.get(action);
            initSmootRotation(rotationObj, face, q);
            handleClickOnFace(face);
        }else if (action === "roll"){
            randomRoll(rotationObj, q);
        }else {
            handleClickOnFace(20);
        }
    }
}

function goToHash(){
    let urlThemeStr = window.location.hash;
    if (urlThemeStr.length > 1){
        urlThemeStr = urlThemeStr.slice(2);
        let icoTheme = document.getElementById("icoTheme");
        let urlHashTheme = document.getElementById(urlThemeStr);
        if (urlHashTheme === null){
            return;
        }
        if (urlHashTheme.innerHTML.length < 100 ){
            console.log("empty");
            urlHashTheme = document.getElementById("empty");
        }

        icoTheme.innerHTML = urlHashTheme.innerHTML;
        return;
    }
}

function main() {

    // So that the pages sections can be shared by link
    goToHash();

    // Initial orientation
    let q = new Quaternion([ 0.3777867555618286, -0.42694273591041565, -0.5319589972496033, -0.45036014914512634 ]);
    let q_inv = q.inv();
    let isRotating = false;
    let menuRotationOb = {
        frame : 40,
        maxFrames : 40,
        d_alpha: 0.0,
        axis: [0.0, 0.0, 0.0],
    }

    const menu = document.getElementById('dropDownMenu');

    menu.addEventListener('click', event => {
        clickOnMenu(event, q, menuRotationOb);
    });

    let t0 = 0.0;
    menu.addEventListener("touchstart", (e) => {
        t0 = Date.now();
    });
    menu.addEventListener("touchend", (e) => {
        if (Date.now() - t0 < 200){
            clickOnMenu(e, q, menuRotationOb);
        }
    });

    // Get A WebGL context
    let canvas = document.querySelector("#icoCanvas");
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    let gl = canvas.getContext("webgl2");
    if (!gl) {
        return;
    }

    // ============  Menu symbols  texture ==============
    let texture = addImageTexture(gl, "icosahedron/textureMenu.png");


    // ============  Shader program  ================
    let renderProgramOb = createIcoProgram(gl);
    gl.useProgram(renderProgramOb.program);
    gl.uniform4f(renderProgramOb.uniformLocations.q, q.q[0], q.q[1], q.q[2], q.q[3]);
    gl.uniform4f(renderProgramOb.uniformLocations.q_inv, q_inv.q[0], q_inv.q[1], q_inv.q[2], q_inv.q[3]);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(renderProgramOb.uniformLocations.tex, 0);


    // ============  Vertices ==============
    let verticeAttrs = createIcoVertices();
    let verticeAttrObject = loadVerticeData(gl, verticeAttrs, renderProgramOb.attribLocs);

    // ============ Selection ==============
    let selectionProgramOb = createSelectProgram(gl);

    const selectTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, selectTexture);

    // create a depth renderbuffer
    const depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    selectionProgramOb.db = depthBuffer;

    selectionProgramOb.fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, selectionProgramOb.fb);

    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    const level = 0;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, selectTexture, level);

    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

    setFramebufferAttachmentSizes(gl, 1, 1, selectTexture, selectionProgramOb.db);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    canvas.addEventListener('mousedown', e => {
        isRotating = true;
        t0 = Date.now();
    });

    window.addEventListener('mouseup', e => {
        isRotating = false;
        if (Date.now() - t0 < 200){
            goToFaceLink(gl, selectionProgramOb, q, q_inv);
        }
    });

    function rotate(e){
        const pos = getCanvasCursorPosition(e, gl.canvas);
        if (isRotating) {
            let dx = -(pos.x - old_pos.x);
            let dy = (pos.y - old_pos.y);
            let velocity = Math.pow(dx*dx + dy*dy + 0.0001, 0.5);

            let q_rot = rotationQuaternion(-dy / velocity, -dx / velocity, 0.0, velocity * 1.5 );
            q = q_rot.mult(q);
            q_inv = q.inv();
        }
        old_pos.x = pos.x;
        old_pos.y = pos.y;

    }

    window.addEventListener('mousemove', e => {
        rotate(e);
    });

    canvas.addEventListener("touchstart", (e) => {
        let touch = e.targetTouches.item(0);
        let pos = getCanvasCursorPosition(touch, gl.canvas);
        old_pos.x = pos.x;
        old_pos.y = pos.y;
        isRotating = true;
    });


    canvas.addEventListener("touchend", (e) => {
        isRotating = false;
    });

    canvas.addEventListener("touchmove", (e) => {
        let touch = e.targetTouches.item(0);
        let pos = getCanvasCursorPosition(touch, gl.canvas);
        rotate(touch);
    });



    // ===================================================================

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // gl.enable(gl.BLEND);
    // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Clear the canvas
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // // turn on depth testing
    gl.enable(gl.DEPTH_TEST);

    // Tell it to use our program (pair of shaders)
    gl.useProgram(renderProgramOb.program);

    // Bind the attribute/buffer set we want.
    gl.bindVertexArray(verticeAttrObject.VAO);

    // draw
    let primitiveType = gl.TRIANGLES;
    let offset = 0;
    let count = renderProgramOb.nvertices;

    requestAnimationFrame(animation);

    function smootRotate(rotationObj){
        rotationObj.frame += 1;
        let transform = rotationQuaternion(rotationObj.axis[0],
                                rotationObj.axis[1],
                                rotationObj.axis[2],
                                rotationObj.d_alpha)
        q = transform.mult(q);
        q_inv = q.inv();
    }
    function animation(t){
        if (menuRotationOb.frame < menuRotationOb.maxFrames){
            smootRotate(menuRotationOb);
        }
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(renderProgramOb.program);
        gl.uniform4f(renderProgramOb.uniformLocations.q, q.q[0], q.q[1], q.q[2], q.q[3]);
        gl.uniform4f(renderProgramOb.uniformLocations.q_inv, q_inv.q[0], q_inv.q[1], q_inv.q[2], q_inv.q[3]);
        gl.uniform1f(renderProgramOb.uniformLocations.t, t/400.0);
        gl.drawArrays(primitiveType, offset, count);
        requestAnimationFrame(animation);

    }
}

main();
