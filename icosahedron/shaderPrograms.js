"use strict";

var vertexShaderSource = `#version 300 es

    // an attribute is an input (in) to a vertex shader.
    // It will receive data from a buffer
    in vec3 a_position;
    in vec3 a_normal;

    out vec3 normal;

    vec4 mul_quatern(vec4 u, vec4 v){
        //u.x, u.y, u.z, u.w = u
        //v.x, v.y, v.z, v.w = v
        return vec4(
                -v.y * u.y - v.z * u.z - v.w * u.w + v.x * u.x,
                v.y * u.x + v.z * u.w - v.w * u.z + v.x * u.y,
                -v.y * u.w + v.z * u.x + v.w * u.y + v.x * u.z,
                v.y * u.z - v.z * u.y + v.w * u.x + v.x * u.w);
    }
    uniform vec4 q;
    uniform vec4 q_inv;

    void main() {

        vec4 pos = mul_quatern(vec4(0.0, a_position), q_inv);
        pos = mul_quatern(q, pos);

        vec4 normal0 = mul_quatern(vec4(0.0, a_normal), q_inv);
        normal0 = mul_quatern(q, normal0);

        gl_Position = vec4(pos.yzw, 1.0);
        normal = normal0.yzw;
    }
`;

var fragmentShaderSource = `#version 300 es

    // fragment shaders don't have a default precision so we need
    // to pick one. highp is a good default. It means "high precision"
    precision highp float;

    // we need to declare an output for the fragment shader
    out vec4 outColor;
    in vec3 normal;

    vec3 c0 = vec3(0.0/255.0, 149.0/255.0, 177.0/255.0);
    vec3 lightPos = vec3(4,1,-2);

    void main() {

    vec3 lightDirection = normalize(lightPos);
    float intensity = 0.9 + 0.5 * dot(normal, lightDirection);
    outColor = vec4(c0 * intensity, 1.0);
    }
`;

function createShader(gl, type, source) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }

  console.log(gl.getShaderInfoLog(shader));  // eslint-disable-line
  gl.deleteShader(shader);
  return undefined;
}

function createProgram(gl, vertexShader, fragmentShader) {
  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  var success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }

  console.log(gl.getProgramInfoLog(program));  // eslint-disable-line
  gl.deleteProgram(program);
  return undefined;
}

export function createIcoProgram(gl){
    // create GLSL shaders, upload the GLSL source, compile the shaders
    var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    // Link the two shaders into a program
    var program = createProgram(gl, vertexShader, fragmentShader);

    let programObject = {
        program: program,
        nvertices: 20*3,
        attribLocations: {
            vertex: gl.getAttribLocation(program, "a_position"),
            normal: gl.getAttribLocation(program, "a_normal"),
        },

        uniformLocations: {
            q: gl.getUniformLocation(program, "q"),
            q_inv: gl.getUniformLocation(program, "q_inv"),
        },
    };

    return programObject;
}
