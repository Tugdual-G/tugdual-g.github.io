"use strict";
import { createIcoProgram, createSelectProgram } from "./shaderPrograms.js"
import { Quaternion, rotationQuaternion } from "./quaternions.js"

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
    let about = document.getElementById("icoTheme");
    let theme;
    function handleTheme(){
        about.innerHTML = theme.innerHTML;
        about.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
    }
    switch (face){
        // case 1:
        //     window.open("http://localhost:8000/","_self")
        //     break;

        case 0:
            break;
        case 2:
            // #cv
            theme = document.querySelector("#cv");
            handleTheme();
            break;
        case 9:
            // ?
            theme = document.querySelector("#empty");
            handleTheme();
            break;
        case 6:
            theme = document.querySelector("#trees");
            handleTheme();
            break;
        case 12:
            theme = document.querySelector("#bike");
            handleTheme();
            break;
        case 13:
            theme = document.querySelector("#code");
            handleTheme();
            break;
        case 14:
            theme = document.querySelector("#spoons");
            handleTheme();
            break;
        case 17:
            theme = document.querySelector("#mathsPhysics");
            handleTheme();
            break;
        case 19:
            theme = document.querySelector("#sewing");
            handleTheme();
            break;
        default:
            // theme = document.querySelector("#empty");
            // about.innerHTML = theme.innerHTML;
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

function main() {
    // Get A WebGL context
    let canvas = document.querySelector("#icoCanvas");
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    let gl = canvas.getContext("webgl2");
    if (!gl) {
        return;
    }

    // Initial orientation
    let q = new Quaternion(0.070040762424469, 0.800381064414978, 0.42698973417282104, -0.30167156457901);
    let q_inv = q.inv();
    let isRotating = false;


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

    let t0 = 0.0;
    canvas.addEventListener('mousedown', e => {
        isRotating = true;
        t0 = Date.now();
    });

    window.addEventListener('mouseup', e => {
        isRotating = false;
        if (Date.now() - t0 < 200){
            goToFaceLink(gl, selectionProgramOb, q, q_inv);
            console.log(q.q);
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
    function animation(t){
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
