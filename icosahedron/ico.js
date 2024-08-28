"use strict";
import {createIcoProgram} from "./shaderPrograms.js"
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

    pos.x = pos.x * target.width  / target.clientWidth;
    pos.y = pos.y * target.height / target.clientHeight;

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
    let texCoord = [[0.0,0.0],[1.0,0.0],[0.5, Math.sqrt(3)/2.0]]

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
            verticeAttrs[i * 24 + j * 8 + 6] = texCoord[j][0];
            verticeAttrs[i * 24 + j * 8 + 7] = texCoord[j][1];
        }
    }
    return verticeAttrs;
}


function main() {
    // Get A WebGL context
    let canvas = document.querySelector("#icoCanvas");
    canvas.width *= 2;
    canvas.height *= 2;
    let gl = canvas.getContext("webgl2");
    if (!gl) {
        return;
    }

    let q = rotationQuaternion(1.0, 1.0, 0.0, 0.2);
    let q_inv = q.inv();
    let isRotating = false;

    canvas.addEventListener('mousedown', e => {
        isRotating = true;
    });

    canvas.addEventListener('mouseup', e => {
        isRotating = false;
    });

    window.addEventListener('mousemove', e => {
        const pos = getCanvasCursorPosition(e, gl.canvas);
        if (isRotating) {
            let dx = -(pos.x - old_pos.x);
            let dy = -(pos.y - old_pos.y);
            let velocity = Math.pow(dx*dx + dy*dy + 0.0001, 0.5);

            let q_rot = rotationQuaternion(-dy / velocity, -dx / velocity, 0.0, velocity * 0.01);
            q = q_rot.mult(q);
            q_inv = q.inv();
            // q_inv = q_inv.mult(q_rot.inv());
        }
        old_pos.x = pos.x;
        old_pos.y = pos.y;

    });

    // Create a texture.
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Fill the texture with a 1x1 blue pixel.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                  new Uint8Array([0, 0, 255, 255]));

    // Asynchronously load an image
    var image = new Image();
    image.src = "blog.png";
    image.addEventListener('load', function() {
        // Now that the image has loaded make copy it to the texture.
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
    });

    let programOb = createIcoProgram(gl);
    gl.useProgram(programOb.program);
    gl.uniform4f(programOb.uniformLocations.q, q.q[0], q.q[1], q.q[2], q.q[3]);
    gl.uniform4f(programOb.uniformLocations.q_inv, q_inv.q[0], q_inv.q[1], q_inv.q[2], q_inv.q[3]);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(programOb.uniformLocations.tex, 0);

    // Create a buffer and put three 2d clip space points in it
    let positionBuffer = gl.createBuffer();

    // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    let verticeAttrs = createIcoVertices();
    console.log(verticeAttrs);
    gl.bufferData(gl.ARRAY_BUFFER, verticeAttrs, gl.STATIC_DRAW);

    // Create a vertex array object (attribute state)
    let vao = gl.createVertexArray();

    // and make it the one we're currently working with
    gl.bindVertexArray(vao);

    // Turn on the attribute
    gl.enableVertexAttribArray(programOb.attribLocations.vertex);

    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    {
        let size = 3;
        let type = gl.FLOAT;
        let normalize = false;
        let stride = 8 * 4;
        let offset = 0;
        gl.vertexAttribPointer(
            programOb.attribLocations.vertex, size, type, normalize, stride, offset);
    }

    // Turn on the attribute
    gl.enableVertexAttribArray(programOb.attribLocations.normal);

    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    {
        let size = 3;
        let type = gl.FLOAT;
        let normalize = false;
        let stride = 8 * 4;
        let offset = 3 * 4;
        gl.vertexAttribPointer(
            programOb.attribLocations.normal, size, type, normalize, stride, offset);
    }

    // Turn on the attribute
    gl.enableVertexAttribArray(programOb.attribLocations.texCoord);

    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    {
        let size = 2;
        let type = gl.FLOAT;
        let normalize = false;
        let stride = 8 * 4;
        let offset = 6 * 4;
        gl.vertexAttribPointer(
            programOb.attribLocations.texCoord, size, type, normalize, stride, offset);
    }

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);



    // Clear the canvas
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // // turn on depth testing
    gl.enable(gl.DEPTH_TEST);

    // Tell it to use our program (pair of shaders)
    gl.useProgram(programOb.program);

    // Bind the attribute/buffer set we want.
    gl.bindVertexArray(vao);

    // draw
    let primitiveType = gl.TRIANGLES;
    let offset = 0;
    let count = 20 * 3;

    requestAnimationFrame(animation);
    function animation(){
        gl.uniform4f(programOb.uniformLocations.q, q.q[0], q.q[1], q.q[2], q.q[3]);
        gl.uniform4f(programOb.uniformLocations.q_inv, q_inv.q[0], q_inv.q[1], q_inv.q[2], q_inv.q[3]);
        gl.drawArrays(primitiveType, offset, count);
        requestAnimationFrame(animation);

    }
}

main();
