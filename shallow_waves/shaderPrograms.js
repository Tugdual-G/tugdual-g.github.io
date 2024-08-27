// Defines all the shader programs to compute basic wave propagation

const vertexShaderSource =
   `#version 300 es
    in vec4 a_position;
    void main() {
        gl_Position = a_position;
    }
`;

function compileShader(gl, source, type) {
  // Compiles shaders
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    let info = gl.getShaderInfoLog(shader);
      throw "Error: cannot compile shader \n\n" + info;
  }
  return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
  let program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  let success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }

  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

export function createBilinearRenderProgram(gl, fbShape, frameBuffer){
    // The final rendering shaders

    const renderFragmentShaderSource =
       `#version 300 es
        precision highp float;
        uniform sampler2D tex;
        uniform sampler2D mask;
        uniform vec2 fbShape;
        out vec4 color;

        float ambientLight = 1.0;
        float specularLightStrength = 0.9;
        // Color gradient
        vec3 c0 = vec3(0.0/255.0, 149.0/255.0, 177.0/255.0);
        vec3 lightPosition = vec3(1.0, 2.0, 8.0);
        // vec4 c1 = vec4(167.0/255.0, 255.0/255.0,235.0/255.0, 1.0);

        float bilinear(sampler2D tex, vec2 tex_coord){
            vec2 tex_shape = vec2(textureSize(tex, 0));
            float j_tex = tex_coord.x * tex_shape.x;
            float i_tex = tex_coord.y * tex_shape.y;
            float i_b = floor(i_tex - 0.5) + 0.5;
            float i_t = ceil(i_tex - 0.5) + 0.5;
            float j_l = floor(j_tex - 0.5) + 0.5;
            float j_r = ceil(j_tex - 0.5) + 0.5;
            float dist_l = j_r - j_tex;
            float dist_b = i_t - i_tex;
            float c_lb = texture(tex, vec2(j_l, i_b)/tex_shape).x;
            float c_lt = texture(tex, vec2(j_l, i_t)/tex_shape).x;
            float c_rb = texture(tex, vec2(j_r, i_b)/tex_shape).x;
            float c_rt = texture(tex, vec2(j_r, i_t)/tex_shape).x;
            float c = mix(mix(c_rt, c_lt, dist_l),mix(c_rb, c_lb, dist_l), dist_b);
            return c;
        }

        vec3 normal(sampler2D tex, vec2 texCoord, float dx, float dy){
           float dfdx = 0.5 * (bilinear(tex, texCoord - vec2(dx, 0.0)) - bilinear(tex, texCoord + vec2(dx, 0.0)));
           float dfdy = 0.5 * (bilinear(tex, texCoord - vec2(0.0, dy)) - bilinear(tex, texCoord + vec2(0.0, dy)));
           float isCloseToMask = texture(mask, texCoord - vec2(dx, dy)).x + texture(mask, texCoord + vec2(dx, dy)).x;
           isCloseToMask += texture(mask, texCoord - vec2(dx, -dy)).x + texture(mask, texCoord + vec2(dx, -dy)).x;
           if (isCloseToMask == 0.0){
                return normalize(cross(normalize(vec3(1.0, 0, dfdx)), normalize(vec3(0.0, 1.0, dfdy))));
            }else{
                return vec3(0.0, 0.0, 1.0);
            }
        }


        void main() {

            vec3 lightDirection = normalize(lightPosition);
            vec2 texCoord = gl_FragCoord.xy / fbShape;
            vec3 faceNormal = normal(tex, texCoord, 2.0/fbShape.x, 2.0/fbShape.y);
            float diffusion = dot(lightDirection, faceNormal) - lightDirection.z;

            vec3 fragmentViewDirection = normalize(vec3(0.0, 0.0, 1.0) - vec3(gl_FragCoord/fbShape.x));
            vec3 reflectedLightDirection = 2.0 * dot(faceNormal, lightDirection)*faceNormal-lightDirection;
            float specularLigth = pow(max(dot(reflectedLightDirection, fragmentViewDirection), 0.0), 32.0);
            specularLigth *= specularLightStrength;

            float intensity =  (specularLigth + ambientLight - diffusion);
            //vec3 col = c0 * (1.0 + 0.9 * diffusion);
            color = vec4(c0 * intensity, 1.0);
        }
   `;
    const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, renderFragmentShaderSource, gl.FRAGMENT_SHADER);
    const shaderProgram = createProgram(gl, vertexShader, fragmentShader);

    let programObject = {
        program: shaderProgram,
        fbShape: fbShape,
        fb: frameBuffer,
        nvertices: 6,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, "a_position"),
        },
        uniformLocations: {
            fbShape: gl.getUniformLocation(shaderProgram, "fbShape"),
            tex: gl.getUniformLocation(shaderProgram, "tex"),
            mask: gl.getUniformLocation(shaderProgram, "mask"),
        },
    };

    gl.useProgram(shaderProgram);
    gl.uniform2f(programObject.uniformLocations.fbShape, fbShape[0], fbShape[1]);

    return programObject;
}

export function createMaskProgram(gl, shape, frameBuffer){
    // Mask

    const initEtaFragmentShaderSource =
        `#version 300 es
        precision highp float;

        out vec4 color;
        void main() {
            color = vec4(1.0, 0.0, 0.0, 0.0);
        }
    `;


    const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, initEtaFragmentShaderSource, gl.FRAGMENT_SHADER);
    const shaderProgram = createProgram(gl, vertexShader, fragmentShader);

    let programObject = {
        program: shaderProgram,
        fb: frameBuffer,
        fbShape: shape,
        nvertices: 18,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, "a_position"),
        },
    };

    gl.useProgram(programObject.program);

    return programObject;
}

export function createInitEtaProgram(gl, shape, domain_dimensions, frameBuffer){
    // eta is the water height

    const initEtaFragmentShaderSource =
        `#version 300 es
        precision highp float;

        uniform vec2 shape;
        uniform vec2 domain_dimensions;

        out vec4 color;
        void main() {
            vec2 cartesian_coord = gl_FragCoord.xy * domain_dimensions / shape;
            float R2 = dot(cartesian_coord-domain_dimensions/3.0,cartesian_coord-domain_dimensions/3.0);
            float c = 2.0 * exp(-R2/64.0);
            c -= exp(-R2/32.0);
            R2 = dot(cartesian_coord-2.0*domain_dimensions/3.0,cartesian_coord-3.0*domain_dimensions/4.0);
            c += 1.0*exp(-R2/20.0);
            color = vec4(c, 0.0, 0.0, 0.0);
        }
    `;


    const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, initEtaFragmentShaderSource, gl.FRAGMENT_SHADER);
    const initEtaShaderProgram = createProgram(gl, vertexShader, fragmentShader);

    let programObject = {
        program: initEtaShaderProgram,
        fb: frameBuffer,
        fbShape: shape,
        nvertices: 6,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(initEtaShaderProgram, "a_position"),
        },
        uniformLocations: {
            shape: gl.getUniformLocation(initEtaShaderProgram, "shape"),
            domain_dimensions: gl.getUniformLocation(initEtaShaderProgram, "domain_dimensions"),
        },
    };

    gl.useProgram(programObject.program);
    gl.uniform2f(programObject.uniformLocations.shape, shape[0], shape[1]);
    gl.uniform2f(programObject.uniformLocations.domain_dimensions, domain_dimensions[0], domain_dimensions[1]);

    return programObject;
}

export function createCopyEtaProgram(gl, etaShape, frameBuffer){

    const fragmentShaderSource =
        `#version 300 es
        precision highp float;

        out vec4 color;
        void main() {
            color = vec4(0.0, 0.0, 0.0, 0.0);
        }
    `;


    const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);
    const shaderProgram = createProgram(gl, vertexShader, fragmentShader);

    let programObject = {
        program: shaderProgram,
        fb: frameBuffer,
        fbShape: UVshape,
        nvertices: 6,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, "a_position"),
        },
    };

    gl.useProgram(programObject.program);
    return programObject;
}

export function createUVProgram(gl, frameBuffer, UVShape, dx, dt, g){

    const fragmentShaderSource =
        `#version 300 es
        precision highp float;

        uniform sampler2D eta;
        uniform sampler2D UV;
        uniform sampler2D mask;
        uniform float dt;

        out vec4 color;
        void main() {

            ivec2 etaShape = textureSize(eta, 0);
            float dU = 0.0;
            float dV = 0.0;
            int i = int(gl_FragCoord.y);
            int j = int(gl_FragCoord.x);

            if ( j < etaShape.x && i < etaShape.y && texture(mask, vec2(j, i)/vec2(etaShape)).x != 1.0) {
                if ( j > 0) {
                    dU = dt * (texelFetch(eta, ivec2(j, i), 0).x - texelFetch(eta, ivec2(j - 1, i), 0).x);
                }
                if ( i > 0 ) {
                    dV = dt * (texelFetch(eta, ivec2(j, i), 0).x - texelFetch(eta, ivec2(j, i - 1), 0).x);
                }
            }
            color = vec4(0.9995 * texelFetch(UV, ivec2(j, i), 0).x - dU, 0.9995 * texelFetch(UV, ivec2(j,i), 0).y - dV, 0.0, 0.0);
        }
   `;

    const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);
    const shaderProgram = createProgram(gl, vertexShader, fragmentShader);

    let programObject = {
        program: shaderProgram,
        fb: frameBuffer,
        fbShape: UVShape,
        nvertices: 6,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, "a_position"),
        },
        uniformLocations: {
            eta: gl.getUniformLocation(shaderProgram, "eta"),
            UV: gl.getUniformLocation(shaderProgram, "UV"),
            mask: gl.getUniformLocation(shaderProgram, "mask"),
            dt: gl.getUniformLocation(shaderProgram, "dt"),
        },
    };

    gl.useProgram(programObject.program);
    gl.uniform1f(programObject.uniformLocations.dt, g*dt/dx);

    return programObject;
}

export function createAdvecProgram(gl, etaShape, frameBuffer, dt, domain_dimensions){

    const fragmentShaderSource =
       `#version 300 es
        precision highp float;

        uniform sampler2D eta;
        uniform sampler2D UV;
        uniform vec2 domain_dimensions;
        uniform vec2 cursor_position;
        uniform float cursor_velocity;
        uniform float dt;

        out vec4 color;


        float upwind(float Ur, float Ul, float Vt, float Vb, int j, int i){
            float f = 0.0;
            if (Ur > 0.0) {
                    f -= texelFetch(eta, ivec2(j, i), 0).x * Ur;
            } else{
                    f -= texelFetch(eta, ivec2(j+1, i), 0).x * Ur;
            }
                if (Ul > 0.0) {
                    f += texelFetch(eta, ivec2(j-1, i), 0).x * Ul;
            } else{
                    f += texelFetch(eta, ivec2(j, i), 0).x * Ul;
            }
                if (Vt > 0.0) {
                    f -= texelFetch(eta, ivec2(j, i), 0).x * Vt;
            } else{
                    f -= texelFetch(eta, ivec2(j, i+1), 0).x * Vt;
            }
                if (Vb > 0.0) {
                    f += texelFetch(eta, ivec2(j, i-1), 0).x * Vb;
            } else{
                    f += texelFetch(eta, ivec2(j, i), 0).x * Vb;
            }
            return f;
        }

        void main() {
            ivec2 etaShape = textureSize(eta, 0);
            int i = int(gl_FragCoord.y);
            int j = int(gl_FragCoord.x);

            float Ur = 0.0; // U right
            float Ul = 0.0; // U left
            float Vt = 0.0;
            float Vb = 0.0;

            float cursor_trail = 0.0;

            Ur = texelFetch(UV, ivec2(j + 1, i), 0).x;
            Ul = texelFetch(UV, ivec2(j, i), 0).x;
            Vt = texelFetch(UV, ivec2(j, i+1), 0).y;
            Vb = texelFetch(UV, ivec2(j, i), 0).y;

            float f = upwind(Ur, Ul, Vt, Vb, j, i);

            vec2 cartesian_coord = gl_FragCoord.xy * domain_dimensions / vec2(float(etaShape.x), float(etaShape.y));
            cartesian_coord -= domain_dimensions*cursor_position;
            float R2 = dot(cartesian_coord, cartesian_coord);
            cursor_trail =  exp(-R2/4.0);
            cursor_trail *=  0.8 * cursor_velocity;

            // To open the domain
            // if ( i > 0 && i < etaShape.y - 1 && j > 0 && j < etaShape.x - 1) {
            // }

            color = vec4(0.9995 * texelFetch(eta, ivec2(j, i), 0).x + dt*f + cursor_trail, 0.0, 0.0, 0.0);
        }
   `;

    const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);
    const shaderProgram = createProgram(gl, vertexShader, fragmentShader);

    let programObject = {
        program: shaderProgram,
        fb: frameBuffer,
        fbShape: etaShape,
        nvertices: 6,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, "a_position"),
        },
        uniformLocations: {
            eta: gl.getUniformLocation(shaderProgram, "eta"),
            UV: gl.getUniformLocation(shaderProgram, "UV"),
            domain_dimensions: gl.getUniformLocation(shaderProgram, "domain_dimensions"),
            cursor_position: gl.getUniformLocation(shaderProgram, "cursor_position"),
            cursor_velocity: gl.getUniformLocation(shaderProgram, "cursor_velocity"),
            dt: gl.getUniformLocation(shaderProgram, "dt"),
        },
    };

    gl.useProgram(programObject.program);
    gl.uniform1f(programObject.uniformLocations.dt, dt);
    gl.uniform2f(programObject.uniformLocations.domain_dimensions, domain_dimensions[0], domain_dimensions[1]);

    return programObject;
}
