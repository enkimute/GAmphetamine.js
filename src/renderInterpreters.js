//@ts-check

/** @module renderInterpreters
 * Contains algebra interpreters that convert multivectors into parametric representations that are then rendered to e.g. SVG or webGL.
 * Each of these interpreters shold process an array of items, recognize the multivectors it can represent and convert them to points,
 * line segments etc. (defined by (arrays of) Euclidean coordinates.)
 */
export default function (options) {
  const PointClass = options.classes[Object.keys(options.classes)[options.n-1]];
  const LineClass = options.classes[Object.keys(options.classes)[options.n-2]];
  const PlaneClass = options.classes[Object.keys(options.classes)[options.n-3]];
  if (PointClass) var pt  = new PointClass();
  if (LineClass) var lt = new LineClass();
  if (options.Element.vector) {
    var nearPlane = options.Element.vector(); nearPlane.e3 = 1; nearPlane.e0 = (options.perspective??5)-0.1;
    var farPlane = options.Element.vector(); farPlane.e3 = 1; farPlane.e0 = -5;
    var origin = options.Element.vector(); origin.e0 = 1; origin = origin.dual();
  }

  var identity;
  // "Interprete" changes multivectors into arrays of euclidean coordinates.
  // it returns a new (equally long!) array where all multivectors are converted.
  // All n-dimensional PGA's are handled in the function below. 
  function interpretePGA(items, options, Goptions) {
    if (identity === undefined) {
      identity = new options.classes.even();
      identity.s = 1;
    }
    var cam = Goptions.camera??Goptions.autoCamera??identity;
    const pointRadius = (Goptions.pointRadius??1);
    return items.map(item=>{
      while (item instanceof Function) item = item();  
      if (item === undefined) return item;
    // Early bail colors and labels
      if (typeof item === 'number') return item;
      if (typeof item === 'string') return item;
    // Global dualisation flag.  
      if (Goptions.dual && item.dual) item = item.dual();
    // Clip lines with front-clip plane.
      if (options.p > 2 && item instanceof LineClass) {
         var pl = origin.prj(item).grade(options.n-1).normalized();
         var dl = item.ip(origin).normalized().dual().gp(Goptions.lineScale??3);
         item = [pl.add(dl), pl.sub(dl)];
      } 
      if (options.p > 2 && item instanceof Array && item.length == 2) {
         var np = cam.reverse().sw(nearPlane);
         var s1 = item[0].rp(np);
         var s2 = item[1].rp(np);
         if (s1 > 0 && s2 < 0) item[0] = item[0].rp(item[1]).op(np);
         if (s2 > 0 && s1 < 0) item[1] = item[0].rp(item[1]).op(np);
      } 
    // Broadcast over arrays  
      if (item instanceof Array) return interpretePGA(item, options, Goptions);
    // Broadcast over objects.
      if (typeof item === "object" && !(item instanceof options.Element)) {
        if (item.data && (item.reload??true)) {
          item.reload  = false; 
          item.rawdata = interpretePGA(item.data, options, Object.assign(Object.assign({},Goptions),{scale:1}));
        }
        return item; 
      }   
    // If needed to perspective projection.
      if (options.p > (Goptions.renderer == 'gl'?3:2) && (item instanceof PointClass || item instanceof LineClass)) {
        item = (cam).cprj(item.conjugate(), item instanceof LineClass ? lt : pt); // join with camera point, intersect with camera hyperplane. 
      }
    // Points are n-1 vectors in all PGA's   
      if (item instanceof PointClass || item.grade(options.n-1).find(x=>x)) {
        // normalize, then dualize to be independent of basis choice. (e12 vs e21)
        const dual_point = item.undual();
        // Check for infinite point.
        if (Math.abs(dual_point.e0) <= 0.005) return [dual_point.e1, dual_point.e2, 0.0];
        // now the Euclidean positions can be trivially extracted
        const sc = (Goptions.scale || 1) / dual_point.e0; 
        return [Math.sign(dual_point.e0) * pointRadius * 0.02, dual_point.e1 * sc, dual_point.e2 * sc,  (dual_point.e3??0) * sc];
      }
    // Lines are n-2 vectors in all PGA's
      if (item instanceof LineClass || item.grade(options.n-2).find(x=>x)) {
        const dual_line = item.undual();
        // Normalized the line
        const s = (Goptions.scale??1)/(dual_line.e01 ** 2 + dual_line.e02 ** 2); 
        // Now extract the point on the line closest to the origin.
        const p = [dual_line.e12 * dual_line.e02 * s, -dual_line.e12 * dual_line.e01 * s];
        // Return two points spanning the line.
        const lineLength = 5;        
        return [
                [0, p[0] + dual_line.e01*lineLength, p[1] + dual_line.e02*lineLength],
                [0, p[0] - dual_line.e01*lineLength, p[1] - dual_line.e02*lineLength],
              ];
      }
    // Planes are n-3 vectors in all PGA's
      if (item instanceof PlaneClass || (options.n > 3 && item.grade(options.n-3).find(x=>x))) {
        const normalized_plane = item.normalized();
        const l = item.norm();
        const reference = [
          options.Element.vector(1,l,l,...Array(options.n-3).fill(0)).dual(), 
          options.Element.vector(1,l,-l,...Array(options.n-3).fill(0)).dual(), 
          options.Element.vector(1,-l,-l,...Array(options.n-3).fill(0)).dual(), 
          options.Element.vector(1,-l,l,...Array(options.n-3).fill(0)).dual()
        ];
        const e1 = (reference[0].rp(reference[1]).rp(reference[2])).normalized();
        const halfway = e1.gp(1/Math.hypot(...e1)).sub(normalized_plane).normalized();
        const R = normalized_plane.gp(halfway);
        const out = (Math.hypot(...halfway) < 1E-5) ? reference:reference.map(x=>R.sw(x));
        //console.log([normalized_plane,halfway,e1,R,R.sw(e1),reference[0], out[0], Math.hypot(...halfway) < 1E-5].map(x=>x+''))
        return interpretePGA([out],options,Goptions)[0];
      }  
      return item;
    })
  };

  return {interpretePGA};
}