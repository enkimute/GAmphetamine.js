//@ts-check

// Simple helper to compile a vertexshader, fragmentshader and program.
  var compile = (gl,vs,fs) => {
  // Compile shaders
    var s=[gl.VERTEX_SHADER,gl.FRAGMENT_SHADER].map((t,i)=>{
      var r=gl.createShader(t); gl.shaderSource(r,[vs,fs][i]); gl.compileShader(r);
      return gl.getShaderParameter(r, gl.COMPILE_STATUS)&&r||console.error([vs,fs][i].split('\n'),'\n',gl.getShaderInfoLog(r));
    });
  // Compile and link program.  
    var p = gl.createProgram(); s.forEach(s=>gl.attachShader(p, s)); gl.linkProgram(p);
    gl.getProgramParameter(p, gl.LINK_STATUS)||console.error(gl.getProgramInfoLog(p));
  // Collect uniforms and attributes required.  
    p.uniforms = Object.fromEntries([...Array(gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS))].map((_,i)=>
      [gl.getActiveUniform(p, i).name, gl.getUniformLocation(p, gl.getActiveUniform(p, i).name)]
    ))
    p.attribs = Object.fromEntries([...Array(gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES))].map((_,i)=>
      [gl.getActiveAttrib(p, i).name, gl.getAttribLocation(p, gl.getActiveAttrib(p, i).name)]
    ))
    console.log(p);
    return p;
  };

// A helper to bind uniforms and attribs.
  const draw = (gl, program, attribs, uniforms, tp) => {
    gl.useProgram(program);
    // create bufer and upload vertices
    if (attribs.pos_m instanceof WebGLVertexArrayObject) {
      gl.bindVertexArray(attribs.pos_m);
    } else {
      var vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(attribs.pos_m), gl.STATIC_DRAW);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); 
      gl.enableVertexAttribArray(0);
      // upload texcoords if needed.
      if (attribs.tex_in) {
        var texcoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(attribs.tex_in), gl.STATIC_DRAW);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0); 
        gl.enableVertexAttribArray(1);
      }
    }  
    gl.lineWidth(2.0);
    // now set all uniforms.
    for (var i in uniforms) {
      var v = uniforms[i];
      if (v instanceof Float32Array || v instanceof Array) {
        if (v.length == 3)  gl.uniform3fv( program.uniforms[i], v );
        if (v.length == 4)  gl.uniform4fv( program.uniforms[i], v );
        if (v.length == 16) gl.uniformMatrix4fv ( program.uniforms[i], false, v );
      } else if (v instanceof WebGLTexture) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, v);
        gl.uniform1i( program.uniforms[i], 0 );
      } else if (typeof v === 'number') {
        gl.uniform1f(program.uniforms[i], v);
      } else {
        console.warn('ignoring uniform ' + i);
      }
    }
    // now render the elements
    gl.drawArrays(tp, 0, attribs.pos_m.length/3);
    // now delete the vertexbuffer
    if (!(attribs.pos_m instanceof WebGLVertexArrayObject)) {
      gl.deleteBuffer(vertexBuffer);
      if (attribs.tex_in) {
        gl.disableVertexAttribArray(1);
        gl.deleteBuffer(texcoordBuffer);
      }
    }  
  }  

// Our basic shaders.
  const vertex = `#version 300 es
    // input and output position as vec4. (modelspace -> worldspace)
    in  vec4 pos_m;
    out vec4 pos_w;
    // modelview and projection matrices.
    uniform mat4 mv;
    uniform mat4 p;
    // Our main vertex transformation.
    void main () {
      gl_PointSize = 18.0;        // Render points bigger.
      pos_w        = mv * pos_m;  // worldspace position is modelview time object space position
      gl_Position  = p * pos_w;   // applying the projection matrix takes us from world to clip space.
    }
  `; 

// The basic fragment shader for flat shaded triangles.
const fragment = `#version 300 es
precision highp float;
// input is the vertex world position.
in vec4 pos_w;
// other parameters are passed in as uniforms
uniform vec4 color;
uniform vec4 color_fixed;
// output goes into the fragment color
out vec4 final;
void main() { 
  // For nice round points.
  float distanceToCenter = length(gl_PointCoord - vec2(0.5)); if (distanceToCenter>=0.5) discard;
  // Fixed light position, figure out the direction to the light.
  vec3 ldir    = normalize(vec3(-5.0,-5.0,10.0) - pos_w.xyz);
  // Now derive a normal from the standard derivatives.
  vec3 normal  = normalize(cross(dFdx(pos_w.xyz), dFdy(pos_w.xyz))); 
  // Lambertian shading.
  float Lambert = clamp(dot(normal,ldir), 0.0, 1.0);
  // Get the eye direction
  vec3 edir = normalize(-pos_w.xyz);
  float phong = Lambert <= 0.0 ? 0.0:pow(max(0.0,dot( edir, reflect(-ldir, -normal) )), 12.0);
  // Mixdown to our output color
  final = vec4( Lambert * color.rgb + color_fixed.rgb + vec3(phong*0.3) , 1.0) * (1.0 - color.a);
}
`;

// Font render vertex shader.
const vertexFont = `#version 300 es
  // input and output position as vec4. (modelspace -> worldspace)
  in  vec4 pos_m;
  in  vec2 tex_in;
  out vec4 pos_w;
  out vec2 tex;
  // modelview and projection matrices.
  uniform vec4 offset;
  uniform float lastr;
  uniform mat4 mv;
  uniform mat4 p;
  // Our main vertex transformation.
  void main () {
    // Create a rotation matrix to bank lastr
    mat4 rot;
    rot[0] = vec4(cos(lastr),-sin(lastr),0.0,0.0);
    rot[1] = vec4(sin(lastr), cos(lastr),0.0,0.0);
    rot[2] = vec4(0.0, 0.0, 1.0, 0.0);
    rot[3] = vec4(0.0, 0.0, 0.0, 1.0);
    vec4 o       = mv * offset;
    pos_w        = (rot*pos_m) + vec4(mv[3][0],mv[3][1],mv[3][2],0.0) + o;
    tex          = tex_in;      // put through texture coordinates.
    gl_Position  = p * vec4(pos_w.xyz, 1.0);   // applying the projection matrix takes us from world to clip space.
  }
`; 

// Font render fragment shader.
const fragmentFont = `#version 300 es
  precision highp float;
  // input is the vertex world position.
  in vec4 pos_w;
  in vec2 tex;
  // other parameters are passed in as uniforms
  uniform vec4 color;
  uniform sampler2D fontTexture;
  // output goes into the fragment color
  out vec4 final;
  void main() { 
    vec4 font = texture(fontTexture, tex);
    if (font.r == 0.0) discard;
    final = vec4( font.rgb * color.rgb, font.r );
  }
`;

// Simple helper to create a gl context and compile our basic programs.
  const specialChars = "∞≅¹²³₀₁₂₃₄₅₆₇₈₉⋀⋁∆⋅·";
  var createContext = (options, Goptions) => {
    // Create canvas and webgl2 context.
    var canvas = document.createElement('canvas');
    var gl     = /** @type {WebGL2RenderingContext} */ (canvas.getContext('webgl2',{alpha : Goptions.alpha || true, preserveDrawingBuffer : true, antialias : true }));
    if (!gl) return console.error('webgl2 support required.')
    Object.assign(canvas.style, { width : '100%', height : '100%' });
    if (Goptions.style) Object.assign(canvas.style, Goptions.style);
    // Basic gl setup
    gl.clearColor(0,0,0,0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.frontFace(gl.CCW);
    // Create a canvas and render a font to it.
    var fw=33, font = Object.assign(document.createElement('canvas'),{width:(21+94)*fw,height:48}),
    ctx = Object.assign(/** @type {object} */(font.getContext('2d',{alpha: false})),{fillStyle:'white', font:'48px lucida console, monospace'});
    for (var i=33; i<127; i++) ctx.fillText(String.fromCharCode(i),(i-33)*fw,40);
    specialChars.split('').forEach((x,i)=>ctx.fillText(x,(i-33+127)*fw,40));
    // Now create and upload the font texture.
    var ftx = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, ftx);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, font);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // Compile some basic programs.
    var program     = compile(gl, vertex, fragment);
    var programFont = compile(gl, vertexFont, fragmentFont);
    Object.assign(/** @type {object} */(canvas), {gl, program, programFont, fontTexture:ftx});
    return canvas;
  }

// Create a contravariant matrix from a rotor. 
function rotor2matrix (options, rotor){
  var x = new options.classes.vector(); x.e1=1; x=rotor.sw(x.dual()).undual();
  var y = new options.classes.vector(); y.e2=1; y=rotor.sw(y.dual()).undual();
  var z = new options.classes.vector(); z.e3=1; z=rotor.sw(z.dual()).undual();
  var w = new options.classes.vector(); w.e0=1; w=rotor.sw(w.dual()).undual();
  var M = [x.e1, x.e2, x.e3, x.e0, //[x.e1,y.e1,z.e1,w.e1,
           y.e1, y.e2, y.e3, y.e0, //x.e2,y.e2,z.e2,w.e2,
           z.e1, z.e2, z.e3, z.e0, //x.e3,y.e3,z.e3,w.e3,
           w.e1, w.e2, w.e3, w.e0] //x.e0,y.e0,z.e0,w.e0];
  return M;
}

// helper
function matrix_mul(a,b) {
  var res = [0,0,0,0,  0,0,0,0,  0,0,0,0,  0,0,0,0];
  for (var i=0; i<4; ++i)
    for (var j=0; j<4; ++j)
       for (var k=0; k<4; ++k)
           res[i*4+k] += a[i*4+j] * b[j*4+k];
  return res; 
}

const pass  = {};
export function renderGL(items = [], options, Goptions = {}, ctx) {
    const arrowSize = (Goptions.arrowSize || 1) * 0.06, arrows = [[0,0],[arrowSize,arrowSize/2], [arrowSize*0.75,0] ,[arrowSize,-arrowSize/2]].map(x=>x.join(',')).join(' ');
    const cam   = (Goptions.camera || Goptions.autoCamera || new options.classes.scalar(1));
    pass.items = items;
    pass.cam   = cam;
  // Make sure we have a context
    if (ctx === undefined) {
      var ret = Object.assign(/** @type {object} */ (createContext(options, Goptions)),{ latedraw : true, selected : -1 });
      ret.onmouseup = e=>{ ret.selected = -1; }
      ret.onmousedown = e=>{
        const rect = ret.getBoundingClientRect();
        var ratio = rect.width / rect.height;
        const x=((e.clientX-rect.left)/(rect.width/4||128)-2)*(rect.width>rect.height?rect.width/rect.height:1),
              y=-((e.clientY-rect.top)/(rect.height/4||128)-2)*(rect.height>rect.width?rect.height/rect.width:1);
        var mv = rotor2matrix(options, pass.cam.reverse());
        var p  = [5/Math.max(ratio,1),0,0,0,  0,5*Math.min(ratio,1),0,0,  0,0,1,2,  0,0,0,10];
        ret.selected = pass.items.findIndex(item=>{ 
          if (item.length!=4 || (item[0] instanceof Array)) return false;
          var titem = options.Element.gp([[p[0],p[4],p[8],p[12]],[p[1],p[5],p[9],p[13]],[p[2],p[6],p[10],p[14]],[p[3],p[7],p[11],p[15]]],
                              options.Element.gp([[mv[0],mv[4],mv[8],mv[12]],[mv[1],mv[5],mv[9],mv[13]],[mv[2],mv[6],mv[10],mv[14]],[mv[3],mv[7],mv[11],mv[15]]],
                              [[item[1]],[item[2]],[item[3]],[1]]));
          titem[0] = titem[0][0] * 2/titem[3][0] * Math.max(ratio,1);
          titem[1] = titem[1][0] * 2/titem[3][0] / Math.min(ratio,1);
          return ((titem[0]-x)**2 + (titem[1]-y)**2 < 0.01);
        });
      }
      ret.onmousemove = e=>{ 
        if (/** @type object */(ret).selected === -1) {
          if (e.buttons === 0) return;
          if (e.buttons === 1) {
            Goptions.h = (Goptions.h??0) + e.movementX/200;
            Goptions.p = (Goptions.p??0) + e.movementY/200;
          } else {
            Goptions.h2 = (Goptions.h2??0) + e.movementX/200;
            Goptions.p2 = (Goptions.p2??0) - e.movementY/200;
          }
          Goptions.updateCam();
          return ret.movePoint(-1,0,0);
        }   
        const rect = ret.getBoundingClientRect();
        const x=((e.clientX-rect.left)/(rect.width/4||128)-2)*(rect.width>rect.height?rect.width/rect.height:1),
              y=-((e.clientY-rect.top)/(rect.height/4||128)-2)*(rect.height>rect.width?rect.height/rect.width:1);
        if (/**@type Object */(ret).movePoint) /** @type object */(ret).movePoint(/** @type object */(ret).selected, x, y );
      }
      return ret;
    }
    var canvas = ctx, {gl, program, programFont, fontTexture} = ctx;
    // Append the canvas and setup the styles
    var s = getComputedStyle(canvas); 
      canvas.width = parseFloat(s.width)*(options.devicePixelRatio||devicePixelRatio||1) ;
      canvas.height = parseFloat(s.height)*(options.devicePixelRatio||devicePixelRatio||1); 
      gl.viewport(0,0, canvas.width|0,canvas.height|0);
    var ratio = canvas.width / canvas.height;
    // Setup default matrices
    var  mv = rotor2matrix( options, cam.reverse()), // [1,0,0,0,  0,1,0,0,  0,0,1,0,  0,0,5,1],
         p  = [ 5/Math.max(ratio,1),0,0,0,  0,5*Math.min(ratio,1),0,0,  0,0,1,2,  0,0,0,10];
    // Now clear.
    gl.clear(gl.COLOR_BUFFER_BIT + gl.DEPTH_BUFFER_BIT);
    // now go over all of the elements.
    var color = [0,0,0,0], black = [0,0,0,0], lastx = -1.95, lasty = 1.8, lastz = 0.0, lastr = 0;
    // contra-transform the initial lastx, lasty with the camera.
    if (Goptions.camera || Goptions.autoCamera) {
      var point = new options.classes.vector(); point.e0 = 1; point.e1 = lastx, point.e2 = lasty; point.e3 = lastz; point = cam.reverse().sw(point.dual()).undual();
      lastx = point.e1; lasty = point.e2; lastz = point.e3;
    }
    var points = [], segments = [], triangles = [];
    items.forEach((item, itemIndex)=>{
      if (item === undefined) return;
    // Fetch the type once.
      const type = typeof item;
      // add points.
      if (item instanceof Array) {
        if (item[0] instanceof Array) {
          if (item.length == 2)  {
            segments.push( item[0][1], item[0][2], item[0][3], item[1][1], item[1][2], item[1][3] );
            lastx = (item[0][1] + item[1][1])/2; lasty = (item[0][2] + item[1][2])/2; lastz = (item[0][3] + item[1][3])/2;
            lastr = Math.PI + Math.atan2(item[1][2]-item[0][2], item[0][1]-item[1][1]);
          }  
          if (item.length == 3) triangles.push( item[0][1], item[0][2], item[0][3], item[1][1], item[1][2], item[1][3], item[2][1], item[2][2], item[2][3], );
          if (item.length == 4) triangles.push( item[0][1], item[0][2], item[0][3], item[1][1], item[1][2], item[1][3], item[2][1], item[2][2], item[2][3], item[0][1], item[0][2], item[0][3], item[2][1], item[2][2], item[2][3], item[3][1], item[3][2], item[3][3] );
        } else {
          lastx = item[1]; lasty = item[2]; lastz = item[3]; lastr = 0;
          points.push( item[1], item[2], item[3] );
        }
      }
      // Support for various special objects
      if (type === "object" && item.rawdata) {
        if (item.vertexArray === undefined) {
           var vtx = [], vtx2 = [];
           item.rawdata.forEach(p=>{
             const [a,b,c,d] = p;
             if (p.length == 2) vtx2.push( a[1], a[2], a[3], b[1], b[2], b[3]);
             if (p.length == 3) vtx.push( a[1], a[2], a[3], b[1], b[2], b[3], c[1], c[2], c[3] );
             if (p.length == 4) vtx.push( a[1], a[2], a[3], b[1], b[2], b[3], c[1], c[2], c[3], a[1], a[2], a[3], c[1], c[2], c[3], d[1], d[2], d[3] );
           })
           if (vtx.length) {
              item.vertexArray = gl.createVertexArray();
              gl.bindVertexArray(item.vertexArray);
              item.vertexBuffer = gl.createBuffer();
              gl.bindBuffer(gl.ARRAY_BUFFER, item.vertexBuffer);
              gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vtx), gl.STATIC_DRAW);
              gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); 
              gl.enableVertexAttribArray(0);
              item.vertexArray.length = vtx.length;
           }
           if (vtx2.length) {
            item.vertexArray2 = gl.createVertexArray();
            gl.bindVertexArray(item.vertexArray2);
            item.vertexBuffer2 = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, item.vertexBuffer2);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vtx2), gl.STATIC_DRAW);
            gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); 
            gl.enableVertexAttribArray(0);
            item.vertexArray2.length = vtx2.length;
           } 
        }
        var mv2 = item.transform?
          matrix_mul(rotor2matrix(options, cam.reverse()), 
          matrix_mul(
              [Goptions.scale??1,0,0,0, 0,Goptions.scale??1,0,0, 0,0,Goptions.scale??1,0, 0,0,0,1]
              ,rotor2matrix( options, item.transform )
          ))
          :matrix_mul( mv, [Goptions.scale??1,0,0,0, 0,Goptions.scale??1,0,0, 0,0,Goptions.scale??1,0, 0,0,0,1]);
        if (item.vertexArray) {
          gl.bindVertexArray(item.vertexArray);
          gl.enableVertexAttribArray(0);
          if (color[3]) { 
            gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); 
            gl.frontFace(gl.CW);
            draw(gl, program, {pos_m : item.vertexArray},{color : color, color_fixed : black, mv:mv2, p }, gl.TRIANGLES);
            gl.frontFace(gl.CCW);
          }
          draw(gl, program, {pos_m : item.vertexArray},{color : color, color_fixed : black, mv:mv2, p }, gl.TRIANGLES);
          if (color[3]) { gl.disable(gl.BLEND); }
          gl.disableVertexAttribArray(0);
          gl.bindVertexArray(null);
        }
        if (item.vertexArray2) {
          gl.bindVertexArray(item.vertexArray2);
          gl.enableVertexAttribArray(0);
          if (color[3]) { 
            gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); 
          }
          draw(gl, program, {pos_m : item.vertexArray2},{color : black, color_fixed : color, mv:mv2, p }, gl.LINES);
          if (color[3]) { gl.disable(gl.BLEND); }
          gl.disableVertexAttribArray(0);
          gl.bindVertexArray(null);
        }
      }
      // render if needed
      if (type === "number" || type === "string" || itemIndex === items.length-1) {
        if (color[3]) { 
          gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); 
          gl.frontFace(gl.CW);
          if (triangles.length) draw(gl, program, {pos_m : triangles},{color : color, color_fixed : black, mv, p }, gl.TRIANGLES);
          gl.frontFace(gl.CCW);
        }
        if (points.length)    {
          gl.disable(gl.DEPTH_TEST);
          draw(gl, program, {pos_m : points},   {color : black, color_fixed : color, mv, p }, gl.POINTS);
          gl.enable(gl.DEPTH_TEST);
        }
        if (segments.length)  draw(gl, program, {pos_m : segments}, {color : black, color_fixed : color, mv, p }, gl.LINES);
        if (triangles.length) draw(gl, program, {pos_m : triangles},{color : color, color_fixed : black, mv, p }, gl.TRIANGLES);
        if (color[3]) { gl.disable(gl.BLEND); }
        points = []; segments = []; triangles = [];
      }
      // render strings
      if (type === "string") {
        var right = new options.classes.vector(); right.e1 = 0.05; right.e2 = 0.05; right = cam.reverse().sw(right);
        lastx += right.e1; lasty += right.e2; lastz += right.e3;
        var fw = 21+94, mapChar = (x)=>{ var c = x.charCodeAt(0)-33; if (c>=94) { c = 94+specialChars.indexOf(x); if(c==93) c=68} return c/fw; };
        gl.enable(gl.BLEND); gl.blendFunc( gl.ONE, gl.ONE_MINUS_SRC_ALPHA ); gl.depthMask(false); gl.disable(gl.CULL_FACE);
        draw(gl, programFont, {
          pos_m  : [...Array(item.length*6*3)].map((_,i)=>{ var x=0,z=-0.2, o=x+(i/18|0)*1; return (0.05)*[o,-1,z,o+1.2,-1,z,o,1,z,o+1.2,-1,z,o+1.2,1,z,o,1,z][i%18]}),
          tex_in : [...Array(item.length*6*2)].map((_,i)=>{ var o=mapChar(item[i/12|0]); return [o,1,o+1/fw,1,o,0,o+1/fw,1,o+1/fw,0,o,0][i%12]})
        },{ 
          color, fontTexture, mv, p,
          offset : [lastx, lasty, lastz, 0],
          lastr,
        }, gl.TRIANGLES);
        // move down.
        var down = new options.classes.vector(); down.e1 = -0.05; down.e2 = -0.20; down = cam.reverse().sw(down);
        lastx += down.e1; lasty += down.e2; lastz += down.e3;
        gl.disable(gl.BLEND); gl.depthMask(true); gl.enable(gl.CULL_FACE);
      }
      // parse new color
      if (type === "number") {
        [color[3],color[0],color[1],color[2]] = /**@type string[]*/(('00000000' + item.toString(16)).slice(-8).match(/../g)).map(x=>parseInt(x,16)/255);
      }
    });

    // Done.
    canvas.ctx = ctx;
    return canvas;

  }
