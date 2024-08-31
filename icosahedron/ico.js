"use strict";
import { createIcoProgram, createSelectProgram } from "./shaderPrograms.js"
import { Quaternion, rotationQuaternion } from "./quaternions.js"

let old_pos = {
    x:-1.0,
    y:-1.0,
};

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

function loadVerticeData(gl, verticeAttrs, programObject){

    let positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, verticeAttrs, gl.STATIC_DRAW);

    // Create a vertex array object (attribute state)
    let vao = gl.createVertexArray();

    // and make it the one we're currently working with
    gl.bindVertexArray(vao);

    // Turn on the attribute
    gl.enableVertexAttribArray(programObject.attribLocations.vertex);

    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    {
        let size = 3;
        let type = gl.FLOAT;
        let normalize = false;
        let stride = 8 * 4;
        let offset = 0;
        gl.vertexAttribPointer(
            programObject.attribLocations.vertex, size, type, normalize, stride, offset);
    }

    // Turn on the attribute
    gl.enableVertexAttribArray(programObject.attribLocations.normal);

    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    {
        let size = 3;
        let type = gl.FLOAT;
        let normalize = false;
        let stride = 8 * 4;
        let offset = 3 * 4;
        gl.vertexAttribPointer(
            programObject.attribLocations.normal, size, type, normalize, stride, offset);
    }

    // Turn on the attribute
    gl.enableVertexAttribArray(programObject.attribLocations.texCoord);

    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    {
        let size = 2;
        let type = gl.FLOAT;
        let normalize = false;
        let stride = 8 * 4;
        let offset = 6 * 4;
        gl.vertexAttribPointer(
            programObject.attribLocations.texCoord, size, type, normalize, stride, offset);
    }
    let verticeAttrObject = {
        VAO:vao,
        VBO:positionBuffer,
    }
    return verticeAttrObject;

}

function addImageTexture(gl, imageSource){

    // Create a texture.
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Fill the texture with a 1x1 blue pixel.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 1, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE,
                  new Uint8Array([255]));
    // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    // Asynchronously load an image
    var image = new Image();
    image.src = imageSource;
    image.addEventListener('load', function() {
        // Now that the image has loaded make copy it to the texture.
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
    let about = document.querySelector("#icoTheme");
    let theme;
    switch (face){
        // case 1:
        //     window.open("http://localhost:8000/","_self")
        //     break;

        case 6:
            theme = document.querySelector("#trees");
            about.innerHTML = theme.innerHTML;
            break;
        case 12:
            theme = document.querySelector("#bike");
            about.innerHTML = theme.innerHTML;
            break;
        case 14:
            theme = document.querySelector("#spoons");
            about.innerHTML = theme.innerHTML;
            break;
        default:
            break;

    }
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

    // 0.070040762424469, 0.800381064414978, 0.42698973417282104, -0.30167156457901
    // let q = rotationQuaternion(1.0, 1.0, 0.0, 0.2);
    let q = new Quaternion(0.070040762424469, 0.800381064414978, 0.42698973417282104, -0.30167156457901);
    let q_inv = q.inv();
    let isRotating = false;


    // ============  Text  texture ==============
    let texture = addImageTexture(gl, "icosahedron/textureMenu.png");


    // ============  Program  ================
    let renderProgramOb = createIcoProgram(gl);
    gl.useProgram(renderProgramOb.program);
    gl.uniform4f(renderProgramOb.uniformLocations.q, q.q[0], q.q[1], q.q[2], q.q[3]);
    gl.uniform4f(renderProgramOb.uniformLocations.q_inv, q_inv.q[0], q_inv.q[1], q_inv.q[2], q_inv.q[3]);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(renderProgramOb.uniformLocations.tex, 0);


    // ============  Vertices ==============
    let verticeAttrs = createIcoVertices();
    let verticeAttrObject = loadVerticeData(gl, verticeAttrs, renderProgramOb);

    // ============ Selection ==============
    let selectionProgramOb = createSelectProgram(gl);

    const selectTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, selectTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // create a depth renderbuffer
    const depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);

    function setFramebufferAttachmentSizes(width, height) {
      gl.bindTexture(gl.TEXTURE_2D, selectTexture);

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

    const selectFB = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, selectFB);

    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    const level = 0;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, selectTexture, level);

    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

    setFramebufferAttachmentSizes(1, 1);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);


    function drawSelectedFace(){
        gl.bindFramebuffer(gl.FRAMEBUFFER, selectFB);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.viewport(0, 0, 1, 1);
        gl.useProgram(selectionProgramOb.program);
        gl.uniform4f(selectionProgramOb.uniformLocations.q, q.q[0], q.q[1], q.q[2], q.q[3]);
        gl.uniform4f(selectionProgramOb.uniformLocations.q_inv, q_inv.q[0], q_inv.q[1], q_inv.q[2], q_inv.q[3]);
        gl.uniform2f(selectionProgramOb.uniformLocations.cursorCoord, old_pos.x, old_pos.y);
        gl.drawArrays(primitiveType, offset, count);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }


    let selectionCoord = new Uint8Array(4);
    let selectedFace = 20;
    function goToFaceLink(){
        gl.bindFramebuffer(gl.FRAMEBUFFER, selectFB);
        gl.readPixels(
            0,                 // x
            0,                 // y
            1,                 // width
            1,                 // height
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            selectionCoord);

        selectedFace = getFaceFromTexCoord(selectionCoord);
        handleClickOnFace(selectedFace);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }


    let t0 = 0.0;
    canvas.addEventListener('mousedown', e => {
        isRotating = true;
        t0 = Date.now();
    });

    window.addEventListener('mouseup', e => {
        isRotating = false;
        if (Date.now() - t0 < 200){
            goToFaceLink();
            console.log(q.q);
        }
    });

    window.addEventListener('mousemove', e => {
        const pos = getCanvasCursorPosition(e, gl.canvas);
        if (isRotating) {
            let dx = -(pos.x - old_pos.x);
            let dy = (pos.y - old_pos.y);
            let velocity = Math.pow(dx*dx + dy*dy + 0.0001, 0.5);

            let q_rot = rotationQuaternion(-dy / velocity, -dx / velocity, 0.0, velocity * 1.5 );
            q = q_rot.mult(q);
            q_inv = q.inv();
            // q_inv = q_inv.mult(q_rot.inv());
        }
        old_pos.x = pos.x;
        old_pos.y = pos.y;

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
        drawSelectedFace();
        requestAnimationFrame(animation);

    }
}

main();
