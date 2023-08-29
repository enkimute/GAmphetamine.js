//@ts-check

export function renderSVG(items = [], options, Goptions = {}, ctx) {
    const arrowSize = (Goptions.arrowSize || 1) * 0.06, arrows = [[0,0],[arrowSize,arrowSize/2], [arrowSize*0.75,0] ,[arrowSize,-arrowSize/2]].map(x=>x.join(',')).join(' ');
  // State machine variables.  
    var color = [0,0,0,0], lastx = -1.95, lasty = 1.8, lastr = 0;
    const svgColor = () => `rgba(${color[1]},${color[2]},${color[3]},${1-color[0]/255})`;  
    const line     = (x1,y1,x2=x1,y2=y1,color="#444",width=0.005,alpha=1)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" stroke-opacity="${alpha}"/>`;
    // Build SVG graph 
    var svg=/**@type HTMLElement */(/**@type unknown */(new DOMParser().parseFromString(`
      <SVG viewBox="-2 -2 4 4" style="width:100%; height:100%; user-select:none;"><G stroke-width="${(Goptions.lineWidth||1)*0.005}">${
        // Add a grid.
        (Goptions.grid?/**@type object*/(()=>{
          // Figure out the scales and counts. (unfortunately we do not know the actual aspect here ..)
          const s = Goptions.scale??1, len=8;
          const dist  = Math.min(10**Math.ceil(Math.log10(len/(s*60))), 2*10**Math.ceil(Math.log10(len/(s*60)/2)));
          const count = (len/s/dist)|0;
          const frac = x => x - (x|0);
          const [alpha1, alpha2] = [ Math.min(1,frac(Math.abs(Math.log10(len/(s*60))))*10,1) , Math.min(frac(Math.abs(Math.log10(len/(s*60)/2)))*10, 1) ];
          const getAlpha = i =>{ i = (i - (count/2|0)+100); if (alpha1 < 1) return i % 10 == 0 ? 1 : i % 2 == 0 ? 1 : alpha1; if (alpha2 < 1) return i % 5 == 0 ? 1 : alpha2; }
          return [
            line(-len,0,len,0,"#444",0.008), line(0,-len,0,len,"#444",0.008),
            [...Array(count)].map((_,i)=>line( (i - (count/2|0)) * dist * s, -len, undefined, len, ((i - (count/2|0))%5==0?"#444":"#AAA"), ((i - (count/2|0))%5==0?0.0025:0.0015),getAlpha(i) )),
            [...Array(count)].map((_,i)=>line( -len, (i - (count/2|0)) * dist * s, len, undefined, ((i - (count/2|0))%5==0?"#444":"#AAA"), ((i - (count/2|0))%5==0?0.0025:0.0015),getAlpha(i) )),
            Goptions.labels?[...Array(count)].map((_,i)=>(i - (count/2|0))==0?``:`<text fill-opacity="${getAlpha(i)}" text-anchor="middle" font-size="0.05" x="${(i - (count/2|0)) * dist * s}" y="0.06" >${((i - (count/2|0)) * dist).toFixed(Math.max(Math.ceil(-Math.log10(dist)),1))}</text>`):[],
            Goptions.labels?[...Array(count)].map((_,i)=>`<text fill-opacity="${getAlpha(i)}" text-anchor="end" font-size="0.05" y="${(i - (count/2|0)) * dist * s - 0.01}" x="-0.01" >${((i - (count/2|0)) * -dist).toFixed(Math.max(Math.ceil(-Math.log10(dist)),1))}</text>`):[],
          ];
        })():[]).join('\n')+(()=>{
        // Now add all elements.
        var ret = '';
        items.forEach((item, itemIndex)=>{
          if (item === undefined) return;
        // Fetch the type once.
          const type = typeof item;
        // Parse a new color code.  
          if (type === "number") color = /**@type string[]*/(('00000000' + item.toString(16)).slice(-8).match(/../g)).map(x=>parseInt(x,16));
        // Render points/lines/polygons.  
          if (item instanceof Array) {
          // lines and polygons  
            if (item[0] instanceof Array) {
              [lastx, lasty] = item.reduce(([s,t],[_,x,y])=>[s+x/item.length,t+y/item.length],[0,0]);
              lastr = item.length != 2?0:Math.PI+ Math.atan2(item[1][2]-item[0][2], item[0][1]-item[1][1]);
              if (item.length == 2) {
                ret += `<line style="pointer-events:none" x1="${item[0][1]}" y1="${-item[0][2]}" x2="${item[1][1]}" y2="${-item[1][2]}" stroke="${svgColor()}" />`;
                if (Goptions.arrowSize !== 0) ret += `<polygon style="pointer-events:none" transform="translate(${lastx}, ${-lasty}) rotate(${lastr / Math.PI * 180})" points="${arrows}" fill="${svgColor()}"/>`;
              } else 
                ret += `<polygon style="pointer-events:none" points="${item.map(x=>[x[1],-x[2]].join(',')).join(' ')}" fill="${svgColor()}"/>`;
              lastx -= Math.cos(lastr) * 0.1 * (Goptions.fontSize??1) - Math.sin(lastr) * 0.05 * (Goptions.fontSize??1);
              lasty += Math.sin(lastr) * 0.1 * (Goptions.fontSize??1) + Math.cos(lastr) * 0.05 * (Goptions.fontSize??1);
              return;
            }
          // points/circles  
            if (item[0] === 0.0) {
               const l = 1.8 / Math.hypot(item[1],item[2]), a = Math.atan2(-item[2], item[1]);
               item[1] *= l; item[2] *= l; item[0] = -.02;
               ret += `<polygon style="pointer-events:none" points="0.02,0.005 0.1,0.005 0.1,0.025 0.125,0 0.1,-0.025 0.1,-0.005 0.02,-0.005" transform="translate(${item[1]}, ${-item[2]}) rotate(${a/Math.PI * 180.0})" fill="${svgColor()}"/>
                      <polygon style="pointer-events:none" points="0.02,0.005 0.1,0.005 0.1,0.025 0.125,0 0.1,-0.025 0.1,-0.005 0.02,-0.005" transform="translate(${-item[1]}, ${item[2]}) rotate(${a/Math.PI * 180.0})" fill="${svgColor()}"/>`;
            }
            lastx = item[1]; lasty = item[2]; lastr = 0;
            if (navigator.maxTouchPoints !== 0) { 
              ret += `<circle id="${itemIndex}" style="cursor:pointer" cx="${item[1]}" cy="${-item[2]}" r="0.2" fill="transparent" stroke="rgba(0,0,0,0.1)" />
                      <circle id="${itemIndex}" style="cursor:pointer" cx="${item[1]}" cy="${-item[2]}" r="${Math.abs(item[0])}" fill="${item[0]>0?svgColor():'transparent'}" stroke="${item[0]<0?svgColor():'transparent'}" />`;
              return;
            } else {
              ret += `<circle id="${itemIndex}" style="cursor:pointer" cx="${item[1]}" cy="${-item[2]}" r="${Math.abs(item[0])}" fill="${item[0]>0?svgColor():'transparent'}" stroke="${item[0]<0?svgColor():'transparent'}" />`;
              return;
            }
          }
        // Render labels
          if (type === "string") {
            if (item[0] === '<') { ret+=item; return; }
            ret += `<text style="pointer-events:none" x="${0.025*(Goptions.fontSize??1)}" y="${-0.025*Goptions.fontSize??1}" transform="translate(${lastx}, ${-lasty}) rotate(${lastr / Math.PI * 180})" font-family="Arial" font-size="${(Goptions.fontSize||1)*0.1}" fill="${svgColor()}">${item}</text>`;
            lasty -= Math.cos(lastr) * 0.12 * (Goptions.fontSize??1); lastx -= Math.sin(lastr) * 0.12 * (Goptions.fontSize??1);
            return;
          }
        }); return ret; })()
      }</G></SVG>
    `,`text/html`).body.firstChild));                 
    // If the Goptions has a style object apply it. (first render only!)
    if (Goptions.style && svg && !ctx) Object.assign(svg.style, Goptions.style);
    // Replace the content of a previous render.
    if (ctx) ctx.replaceChildren.apply(ctx,svg.children);
    else { ctx = svg; ctx.selected = -1 }
    // Install point handler that forwards list index of the point.
    ctx.querySelectorAll('circle').forEach(c=>c.onmousedown = e=>{ /** @type object */(ctx).selected = Number(c.id)});
    // Now install the point-drag mouse handler
    ctx.onmousemove = e=>{ 
      if (/** @type object */(ctx).selected === -1) {
        if (e.buttons === 0) return;
        if (e.buttons === 1) {
          Goptions.h = (Goptions.h??0) + e.movementX/200;
          Goptions.p = (Goptions.p??0) + e.movementY/200;
        } else {
          Goptions.h2 = (Goptions.h2??0) + e.movementX/200;
          Goptions.p2 = (Goptions.p2??0) - e.movementY/200;
        }
        Goptions.updateCam();
        return ctx.movePoint(-1,0,0);
      }   
      const rect = ctx.getBoundingClientRect();
      const x=((e.clientX-rect.left)/(rect.width/4||128)-2)*(rect.width>rect.height?rect.width/rect.height:1),
            y=-((e.clientY-rect.top)/(rect.height/4||128)-2)*(rect.height>rect.width?rect.height/rect.width:1);
      if (/**@type Object */(ctx).movePoint) /** @type object */(ctx).movePoint(/** @type object */(ctx).selected, x, y );
    }
    ctx.onmouseup = e=>{ /** @type object */(ctx).selected = -1; };
    // Also install touch handler.
    ctx.ontouchstart = e=>{ 
        let sx = e.touches[0].screenX, sy = e.touches[0].screenY;
      /** @type object */(ctx).selected = Number(e.target.id==''?-1:e.target.id);  e.preventDefault(); 
      //if (ctx.selected >= 0) {
        e.target.ontouchmove = e=>{ 
          ctx.onmousemove(ctx.selected < 0?{buttons:1, movementX : e.touches[0].screenX - sx, movementY: e.touches[0].screenY - sy}:e.touches[0]); 
          sx = e.touches[0].screenX; sy = e.touches[0].screenY;
        };
        e.target.ontouchend = e=>{ e.target.ontouchmove = undefined; ctx.selected = -1; };
      //}
    }
    return ctx;
  }
