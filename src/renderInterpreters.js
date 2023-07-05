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
  if (options.Element.vector) {
    var nearPlane = options.Element.vector(); nearPlane.e3 = 1; nearPlane.e0 = -(options.perspective??5)+0.1;
    var farPlane = options.Element.vector(); farPlane.e0 = 1;
  }
  // "Interprete" changes multivectors into arrays of euclidean coordinates.
  // it returns a new (equally long!) array where all multivectors are converted.
  // All n-dimensional PGA's are handled in the function below. 
  function interpretePGA(items, options, Goptions) {
    return items.map(item=>{
      while (item instanceof Function) item = item();  
      if (item === undefined) return item;
    // Early bail colors and labels
      if (typeof item === 'number') return item;
      if (typeof item === 'string') return item;
    // Global dualisation flag.  
      if (Goptions.dual && item.dual) item = item.dual();
    // Clip lines with front-clip plane.
      if (options.p > 200 && item instanceof LineClass) {
         const cam = (Goptions.camera || Goptions.autoCamera || options.Element.rotor().add(options.Element.scalar(1)));
         const camr = cam.reverse(); cam.sw(item,item);
         const nearPoint = item.op(nearPlane), farPoint = item.op(farPlane);
         if (nearPoint.dual().e0 != farPoint.dual().e0) {
           camr.sw(nearPoint, nearPoint);  camr.sw(farPoint, farPoint);
        //   return interpretePGA([nearPoint, farPoint], options, Goptions);
         }
      } 
      if (options.p > 200 && item instanceof Array && item.length == 2) {
        const cam = (Goptions.camera || Goptions.autoCamera || options.Element.rotor().add(options.Element.scalar(1)));
        const rcam = cam.reverse(); const it = [cam.sw(item[0]), cam.sw(item[1])]; 
        const p1 = nearPlane.rp(it[0]), p2 = nearPlane.rp(it[1]);
        const pn = rcam.sw(it[0].rp(it[1]).op(nearPlane));
        const s1 = Math.sign(item[0].dual().e0), s2 = Math.sign(item[1].dual().e0);
        if (p1*s1 < 0) item = [pn,item[1]];
        if (p2*s2 < 0) item = [item[0],pn];
      } 
    // Broadcast over arrays  
      if (item instanceof Array) return interpretePGA(item, options, Goptions);
    // If needed to perspective projection.
      if (options.p > 2 && (item instanceof PointClass || item instanceof LineClass)) {
        item = item.cprj(Goptions.camera??Goptions.autoCamera??new options.classes.scalar(1)); // join with camera point, intersect with camera hyperplane. 
      }
    // Points are n-1 vectors in all PGA's   
      if (item instanceof PointClass || item.grade(options.n-1).find(x=>x)) {
        // normalize, then dualize to be independent of basis choice. (e12 vs e21)
        const dual_point = item.undual();
        // Check for infinite point.
        if (Math.abs(dual_point.e0) <= 0.005) return [dual_point.e1, dual_point.e2, 0.0];
        // now the Euclidean positions can be trivially extracted
        const sc = (Goptions.scale || 1) / dual_point.e0; 
        return [dual_point.e1 * sc, dual_point.e2 * sc, Math.sign(dual_point.e0) * (Goptions.pointRadius??1) * 0.02];
      }
    // Lines are n-2 vectors in all PGA's
      if (item instanceof LineClass || item.grade(options.n-2).find(x=>x)) {
        const dual_line = item.undual();
        // Normalized the line
        const s = (Goptions.scale??1)/(dual_line.e01 ** 2 + dual_line.e02 ** 2); 
        // Now extract the point on the line closest to the origin.
        const p = [dual_line.e12 * dual_line.e02 * s, -dual_line.e12 * dual_line.e01 * s];
        // Return two points spanning the line.
        const lineLength = 50;        
        return [
                [p[0] + dual_line.e01*lineLength, p[1] + dual_line.e02*lineLength],
                [p[0] - dual_line.e01*lineLength, p[1] - dual_line.e02*lineLength],
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
        const e1 = (reference[0].rp(reference[1]).rp(reference[2]));
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