"use strict";

let vertexShaderSource =
    `#version 300 es

    // an attribute is an input (in) to a vertex shader.
    // It will receive data from a buffer
    in vec3 a_position;
    in vec3 a_normal;
    in vec2 a_texCoord;

    out vec3 normal;
    out vec3 position;
    out vec2 texCoord;

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
        position = pos.yzw;
        pos.yz *= -3.5 / (-pos.w - 3.5); // perspective

        vec4 normal0 = mul_quatern(vec4(0.0, a_normal), q_inv);
        normal0 = mul_quatern(q, normal0);

        gl_Position = vec4(pos.yzw, 1.0);
        normal = normal0.yzw;
        texCoord = a_texCoord;

    }
`;

let fragmentShaderSource = `#version 300 es

    // fragment shaders don't have a default precision so we need
    // to pick one. highp is a good default. It means "high precision"
    precision highp float;
    uniform sampler2D tex;

    in vec3 normal;
    in vec3 position;
    in vec2 texCoord;

    out vec4 outColor;

    vec2 getLocalCoord(vec2 texCoord){
      float x = fract(10.0 * texCoord.x);
      float y = 1.0 - texCoord.y;
      if (x < 0.5){
        if ( y > (2.0 * x) ){
          // pair
          x += 0.5;
          y = 1.0 - y;
        }
      }else{
        if ( y > (2.0 - 2.0 * x) ){
          x -= 0.5;
          y = 1.0 - y;
        }
      }
      return vec2(x, y);
    }

    // signed distance to a 2D triangle
    float sdTriangle(vec2 p) {
      vec2 p0 = vec2(0.0, 0.0);
      vec2 p1 = vec2(1.0, 0.0);
      vec2 p2 = vec2(0.5, 1.0);

      vec2 e0 = p1 - p0;
      vec2 e1 = p2 - p1;
      vec2 e2 = p0 - p2;

      vec2 v0 = p - p0;
      vec2 v1 = p - p1;
      vec2 v2 = p - p2;

      vec2 pq0 = v0 - e0*clamp( dot(v0,e0)/dot(e0,e0), 0.0, 1.0 );
      vec2 pq1 = v1 - e1*clamp( dot(v1,e1)/dot(e1,e1), 0.0, 1.0 );
      vec2 pq2 = v2 - e2*clamp( dot(v2,e2)/dot(e2,e2), 0.0, 1.0 );

        float s = e0.x*e2.y - e0.y*e2.x;
        vec2 d = min( min( vec2( dot( pq0, pq0 ), s*(v0.x*e0.y-v0.y*e0.x) ),
                          vec2( dot( pq1, pq1 ), s*(v1.x*e1.y-v1.y*e1.x) )),
                          vec2( dot( pq2, pq2 ), s*(v2.x*e2.y-v2.y*e2.x) ));

      return -sqrt(d.x)*sign(d.y);
    }

    mat3 gaussianBlur = mat3(1, 2, 1, 2, 4, 2, 1, 2, 1) * 0.0625;
    float gaussFilter(sampler2D tex, vec2 texCoord){
        vec2 dx = dFdx(texCoord) * 0.5;
        vec2 dy = dFdy(texCoord) * 0.5;
        vec3 directions = vec3(-1.0, 0.0, 1.0);
        float c = 0.0;
        for (int i = 0; i < 3; ++i){
            for (int j = 0; j < 3; ++j){
                c += gaussianBlur[i][j] * texture(tex, texCoord + dy * directions[i] + dx * directions[j]).x;
            }

        }
        return c;
    }
    // 71, 171, 171
    vec3 c0 = vec3(71.0/255.0, 201.0/255.0, 201.0/255.0);
    // 255, 255, 224
    vec3 c1 = vec3(255.0/255.0, 255.0/255.0, 224.0/255.0);


    vec3 lightPos = vec3(1.0, 0.0, -1.5);
    float ambientLight = 1.2;
    float specularLightStrength = 0.9;
    float diffusionStrength = 1.5;

    void main() {

    vec3 lightDirection = normalize(lightPos);
    float diffusion = diffusionStrength * dot(lightDirection, normal);

    vec3 fragmentViewDirection = normalize(vec3(0.0 , 0.0, -1.5) - position);
    vec3 reflectedLightDirection = 2.0 * dot(normal, lightDirection)*normal-lightDirection;
    float specularLigth = pow(max(dot(reflectedLightDirection, fragmentViewDirection), 0.0), 32.0);
    specularLigth *= specularLightStrength;

    float intensity =  (specularLigth + ambientLight + diffusion)/(ambientLight + diffusionStrength);

    // c.x = 0.2 + 0.2 * cos(100.0 * sdTriangle(getLocalCoord(texCoord)));

    float dist0 = exp(-pow(sdTriangle(getLocalCoord(texCoord)), 2.0)/0.001);
    dist0 += gaussFilter(tex, texCoord);
    vec3 c =  c1 * dist0 + c0 * (1.0 - dist0);
    outColor = vec4(c * intensity, 1.0);
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
  gl.bindAttribLocation(program, 0, "a_position");
  gl.bindAttribLocation(program, 1, "a_normal");
  gl.bindAttribLocation(program, 2, "a_texCoord");

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
    var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    var program = createProgram(gl, vertexShader, fragmentShader);

    let programObject = {
        program: program,
        nvertices: 20*3,
        attribLocations: {
            vertex: gl.getAttribLocation(program, "a_position"),
            normal: gl.getAttribLocation(program, "a_normal"),
            texCoord: gl.getAttribLocation(program, "a_texCoord"),
        },

        uniformLocations: {
            tex: gl.getUniformLocation(program, "tex"),
            q: gl.getUniformLocation(program, "q"),
            q_inv: gl.getUniformLocation(program, "q_inv"),
        },
    };

    return programObject;
}

let selectVertexShaderSource =
    `#version 300 es

    // an attribute is an input (in) to a vertex shader.
    // It will receive data from a buffer
    in vec3 a_position;
    in vec3 a_normal;
    in vec2 a_texCoord;

    out vec2 texCoord;

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
    uniform vec2 cursorCoord;

    void main() {

        vec4 pos = mul_quatern(vec4(0.0, a_position), q_inv);
        pos = mul_quatern(q, pos);
        pos.yz *= -2.0 / (-pos.w - 2.5); // perspective

        pos.yz -= cursorCoord;
        pos.yz *= 100.0; // zoom on the selection

        gl_Position = vec4(pos.yzw, 1.0);
        texCoord = a_texCoord;

    }
`;

let selectFragmentShaderSource = `#version 300 es

    precision highp float;

    in vec2 texCoord;

    out vec4 outColor;

    void main() {
      outColor = vec4(texCoord.x, texCoord.y, 1.0 , 1.0);
    }
`;

export function createSelectProgram(gl){
    var vertexShader = createShader(gl, gl.VERTEX_SHADER, selectVertexShaderSource);
    var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, selectFragmentShaderSource);

    var program = createProgram(gl, vertexShader, fragmentShader);

    let programObject = {
        program: program,
        nvertices: 20*3,
        attribLocations: {
            vertex: gl.getAttribLocation(program, "a_position"),
            texCoord: gl.getAttribLocation(program, "a_texCoord"),
        },

        uniformLocations: {
            cursorCoord: gl.getUniformLocation(program, "cursorCoord"),
            q: gl.getUniformLocation(program, "q"),
            q_inv: gl.getUniformLocation(program, "q_inv"),
        },
    };

    return programObject;
}
