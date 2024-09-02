import { createBilinearRenderProgram, createInitEtaProgram,
  createUVProgram, createAdvecProgram, createMaskProgram} from "./shaderPrograms.js"

let cursor = {
    x:-1.0,
    y:-1.0,
    velocity:0.0,
};

let old_pos = {
    x:-1.0,
    y:-1.0,
};

let textureVertices = [
    -1.0, -1.0,
    1.0, -1.0,
    1.0, 1.0,
    -1.0, -1.0,
    1.0, 1.0,
    -1.0, 1.0,
];


main();

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


function initVertexBuffer(gl, programObject, vertices) {
    // Créer un tampon des positions pour le carré.

    const vertexBuffer = gl.createBuffer();

    // Définir le vertexBuffer comme étant celui auquel appliquer les opérations
    // de tampon à partir d'ici.

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);


    // Passer mainenant la liste des positions à WebGL pour construire la forme.
    // Nous faisons cela en créant un Float32Array à partir du tableau JavaScript,
    // puis en l'utilisant pour remplir le tampon en cours.

    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Indiquer à WebGL comment extraire les positions à partir du tampon des
    // positions pour les mettre dans l'attribut vertexPosition.
    {
        const numComponents = 2; // extraire 2 valeurs par itération
        const type = gl.FLOAT; // les données dans le tampon sont des flottants 32bit
        const normalize = false; // ne pas normaliser
        const stride = 0; // combien d'octets à extraire entre un jeu de valeurs et le suivant
        const offset = 0; // démarrer à partir de combien d'octets dans le tampon
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.vertexAttribPointer(
        programObject.attribLocations.vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset,
        );
        gl.enableVertexAttribArray(programObject.attribLocations.vertexPosition);
    }

    return vertexBuffer;
}

function initCanvas(){
    const canvas = document.querySelector("#wavesCanvas");
    const gl = canvas.getContext("webgl2");

    if (!gl) {
        alert(
            "Error : WebGL2 is not supported on this machine.",
        );
        return;
    }

    // check if we can render to floating point textures
    const ext2 = gl.getExtension('EXT_color_buffer_float');
    if (!ext2) {
    alert('Need EXT_color_buffer_float');
    return;
    }

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    return gl;

}


function createTexture(gl, shape) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, shape[0], shape[1])
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
}

function createFramebuffer(gl, tex, color_attachment) {
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, color_attachment, gl.TEXTURE_2D, tex, 0);
    return fb;
}

function draw(gl, programObject) {

    gl.bindFramebuffer(gl.FRAMEBUFFER, programObject.fb);
    gl.clearColor(0.0, 0.0, 0.0, 1.0); // effacement en noir, complètement opaque
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(programObject.program);

    gl.viewport(0, 0, programObject.fbShape[0], programObject.fbShape[1]);
    gl.drawArrays(gl.TRIANGLES, 0, programObject.nvertices);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function getTextBoundingBoxes(){

    let canvas = document.querySelector('canvas');
    let html = document.querySelector('html');
    let canvasWidth = canvas.clientWidth;
    let canvasHeight = canvas.clientHeight;
    let canvasRect = canvas.getBoundingClientRect();
    let canvasLeft = canvasRect.left;
    let canvasTop = canvasRect.top;

    let bboxCenter = [0.0, 0.0];
    let bboxWidth = 0.0;
    let bboxHeight = 0.0;


    let elem = document.querySelectorAll('#waveBack');
    let boundingBoxes = [];

    // let rect = elem.getBoundingClientRect();
    for (let entry of elem.values()) {
        let rect = entry.getBoundingClientRect();
        // convert to clip space
        bboxCenter = {
            x: (rect.left - canvasLeft) + rect.width / 2.0,
            y: canvasHeight - (rect.top - canvasTop + rect.height / 2.0),
        };
        bboxWidth = rect.width/2.0 - 2;
        bboxHeight = rect.height/2.0 - 2;
        console.log(rect.height);
        let bbox = {
            left: 2.0 * (bboxCenter.x - bboxWidth) / canvasWidth - 1.0,
            bottom: 2.0 * ( bboxCenter.y - bboxHeight) / canvasHeight - 1.0,
            right: 2.0 * (bboxCenter.x + bboxWidth) / canvasWidth - 1.0,
            top: 2.0 * (bboxCenter.y + bboxHeight) / canvasHeight - 1.0,
        }
        boundingBoxes.push(bbox);
    }
    return boundingBoxes;
}

function getTextRectangleVertices(){
    let boundingBoxes = getTextBoundingBoxes();
    let vertices = new Float32Array(boundingBoxes.length * 12);

    let i = 0;
    for (const bbox of boundingBoxes) {
        vertices[ i * 12 ] = bbox.left;
        vertices[ i * 12 + 1 ] = bbox.bottom;
        vertices[ i * 12 + 2] = bbox.right;
        vertices[ i * 12 + 3] = bbox.bottom;
        vertices[ i * 12 + 4] = bbox.right;
        vertices[ i * 12 + 5] = bbox.top;
        vertices[ i * 12 + 6] = bbox.left;
        vertices[ i * 12 + 7] = bbox.bottom;
        vertices[ i * 12 + 8] = bbox.right;
        vertices[ i * 12 + 9] = bbox.top;
        vertices[ i * 12 + 10] = bbox.left;
        vertices[ i * 12 + 11] = bbox.top;
        ++i;
    }
    return vertices;
}

function main() {

    const gl = initCanvas();


    const canvas = document.querySelector("#wavesCanvas");
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    let canvas_shape = [canvas.width, canvas.height]; // canva domain_center_shape

    let aspect_ratio = canvas.clientHeight / canvas.clientWidth;
    let nx = 256;
    let dt = 0.031;

    // Check if the user is accessing the page on a mobile device
    var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) { nx = 128; dt = 0.062; }

    let ny = Math.round(nx*aspect_ratio);
    let domain_center_shape = [nx, ny];
    let domain_edge_shape = [nx+1, ny+1];

    let Lx = 100.0;
    let dx = Lx / nx
    let Ly = ny * dx
    let domain_dimensions = [Lx, Ly];


    function movements(e){
        const pos = getCanvasCursorPosition(e, gl.canvas);

        cursor.velocity = (pos.x - old_pos.x)*(pos.x - old_pos.x) + (pos.y - old_pos.y)*(pos.y - old_pos.y);
        cursor.velocity = Math.pow(cursor.velocity, 0.5);
        cursor.velocity = cursor.velocity < 10 ? cursor.velocity / 10.0 : 1.0;
        //cursor.velocity = Math.pow(cursor.velocity, 1.5);

        old_pos.x = pos.x;
        old_pos.y = pos.y;

        cursor.x = pos.x / gl.canvas.width;
        cursor.y = 1.0 - pos.y / gl.canvas.height;
        // console.log(cursor.x);

    }

    canvas.addEventListener("touchmove", (e) => {
        let touch = e.targetTouches.item(0);
        movements(touch);
    });

    window.addEventListener('mousemove', e => {
        movements(e);
    });

    window.addEventListener('click', e => {
        const pos = getCanvasCursorPosition(e, gl.canvas);

        cursor.velocity = 1.5;

        old_pos.x = pos.x;
        old_pos.y = pos.y;

        cursor.x = pos.x / gl.canvas.width;
        cursor.y = 1.0 - pos.y / gl.canvas.height;
    });

    let mask_shape = [nx*3, ny*3];
    const mask = createTexture(gl, mask_shape);
    const maskFB = createFramebuffer(gl, mask, gl.COLOR_ATTACHMENT0);

    const eta0 = createTexture(gl, domain_center_shape);
    const eta0FB = createFramebuffer(gl, eta0, gl.COLOR_ATTACHMENT0);

    const eta1 = createTexture(gl, domain_center_shape);
    const eta1FB = createFramebuffer(gl, eta1, gl.COLOR_ATTACHMENT0);

    const UV0 = createTexture(gl, domain_edge_shape);
    const UV0FB = createFramebuffer(gl, UV0, gl.COLOR_ATTACHMENT0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, UV0FB);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const UV1 = createTexture(gl, domain_edge_shape);
    const UV1FB = createFramebuffer(gl, UV1, gl.COLOR_ATTACHMENT0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, UV1FB);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    let renderProgramObject = createBilinearRenderProgram(gl, canvas_shape, null);
    gl.uniform1i(renderProgramObject.uniformLocations.tex, 0);
    gl.uniform1i(renderProgramObject.uniformLocations.mask, 4);
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, mask);



    let maskVertices = getTextRectangleVertices();
    const maskProgramObject = createMaskProgram(gl, mask_shape, maskFB);
    maskProgramObject.nvertices = maskVertices.length/2;

    let maskBuffer = initVertexBuffer(gl, maskProgramObject,  maskVertices );
    draw(gl, maskProgramObject);


    const initEtaProgramObject = createInitEtaProgram(gl, domain_center_shape, domain_dimensions, eta0FB);

    let UVProgramObject = createUVProgram(gl, UV1FB, domain_edge_shape, dx, dt/2.0, 10);
    gl.uniform1i(UVProgramObject.uniformLocations.eta, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, eta0);
    gl.uniform1i(UVProgramObject.uniformLocations.UV, 2);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, UV0);
    gl.uniform1i(UVProgramObject.uniformLocations.mask, 4);

    let advecProgramObject = createAdvecProgram(gl, domain_center_shape, eta1FB, dt/2.0, domain_dimensions);
    gl.uniform1i(advecProgramObject.uniformLocations.eta, 0);
    gl.uniform1i(advecProgramObject.uniformLocations.UV, 3);
    gl.uniform2f(advecProgramObject.uniformLocations.cursor_position, 1000.0, 1000.0);
    gl.uniform1f(advecProgramObject.uniformLocations.cursor_velocity, 0.0);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, UV1);


    let buffer = initVertexBuffer(gl, initEtaProgramObject, new Float32Array(textureVertices));


    // Init eta texture storage
    draw(gl, initEtaProgramObject);

    // // render to the canvas
    // draw(gl, renderProgramObject);

    // Start the leapfrog integrator
    // UV
    gl.useProgram(UVProgramObject.program);
    gl.uniform1i(UVProgramObject.uniformLocations.eta, 0);
    gl.uniform1i(UVProgramObject.uniformLocations.UV, 2);
    UVProgramObject.fb = UV1FB;
    draw(gl, UVProgramObject);
    gl.uniform1f(UVProgramObject.uniformLocations.dt, 10.0*dt/dx);

    // advection
    gl.useProgram(advecProgramObject.program);
    gl.uniform1i(advecProgramObject.uniformLocations.eta, 0);
    gl.uniform1i(advecProgramObject.uniformLocations.UV, 3);
    advecProgramObject.fb = eta1FB;
    draw(gl, advecProgramObject);
    gl.uniform1f(advecProgramObject.uniformLocations.dt, dt);

    // binds eta1
    gl.useProgram(UVProgramObject.program);
    gl.uniform1i(UVProgramObject.uniformLocations.eta, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, eta1);

    const fpsElem = document.querySelector("#fpsValue");
    let framesDT = new Float64Array(20);

    let t0 = 0.0;
    let i = 0;
    requestAnimationFrame(step);

    function step(t1){
        // UV
        gl.useProgram(UVProgramObject.program);
        gl.uniform1i(UVProgramObject.uniformLocations.eta, 1);
        gl.uniform1i(UVProgramObject.uniformLocations.UV, 2);
        UVProgramObject.fb = UV1FB;
        draw(gl, UVProgramObject);

        // advection
        gl.useProgram(advecProgramObject.program);
        gl.uniform1i(advecProgramObject.uniformLocations.eta, 1);
        gl.uniform1i(advecProgramObject.uniformLocations.UV, 3);
        gl.uniform2f(advecProgramObject.uniformLocations.cursor_position, cursor.x, cursor.y);
        gl.uniform1f(advecProgramObject.uniformLocations.cursor_velocity,cursor.velocity);
        advecProgramObject.fb = eta0FB;
        draw(gl, advecProgramObject);

        // renders to the canvas
        draw(gl, renderProgramObject);

        // UV
        gl.useProgram(UVProgramObject.program);
        gl.uniform1i(UVProgramObject.uniformLocations.eta, 0);
        gl.uniform1i(UVProgramObject.uniformLocations.UV, 3);
        UVProgramObject.fb = UV0FB;
        draw(gl, UVProgramObject);

        // advection
        gl.useProgram(advecProgramObject.program);
        gl.uniform1i(advecProgramObject.uniformLocations.eta, 0);
        gl.uniform1i(advecProgramObject.uniformLocations.UV, 2);
        gl.uniform2f(advecProgramObject.uniformLocations.cursor_position, cursor.x, cursor.y);
        gl.uniform1f(advecProgramObject.uniformLocations.cursor_velocity,cursor.velocity);
        advecProgramObject.fb = eta1FB;
        draw(gl, advecProgramObject);


        cursor.velocity = 0.0;
        const dt = t1 - t0;
        framesDT[i] = dt;
        t0 = t1;
        const fps = 1000.0 * framesDT.length / framesDT.reduce((partialSum, a) => partialSum + a, 0);
        if (i%10 == 0){
            fpsElem.textContent = fps.toFixed(1);
        }
        i = (i + 1)%framesDT.length;
        requestAnimationFrame(step);
    }

}
