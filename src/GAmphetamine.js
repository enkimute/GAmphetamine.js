//@ts-check
///////////////////////////////////////////////////////////////////////////////////////////
//
// GAmphetamine - Main Algebra Generator.
//
// arguments
//
// p,q,r      -> positive, negative, zero basis vectors.
// string     -> named algebra templates. ("2DPGA", "3DPGA", ...) or metric string ("0+++-")
// {options}  -> options object(s).
// func       -> function to execute with the generated algebra.
// 
// options
//
// p,q,r           -> metric signature in p,q,r format
// metric          -> metric as string with -+0 ("-+++") or array ([0,1,1,1])
// basis           -> custom basis to use (["1","e1","e2","e21"])
// types           -> an array of types of multivectors to support, and their layout. ([{name:'vector',layout:["e1","e2"]}])
// methods         -> an array of methods to add.
// printPrecision  -> number of significant digits to print behind the decimal separator
// printFormat     -> ["console"||"","latex"]
// startIndex      -> starting index for the first basis vector. (default is 1, or zero if q != 0)
// cayley          -> full custom cayley table.
// precompile      -> precompile all functions. (gets slow for big algebras, defaults to false)
// flat            -> use flat storage model. (full 2^n sized multivectors)
// CSE             -> perform extra CSE. (defaults to true) 
// prefetch        -> prefetch mv coefficients. 
// debug           -> store debug information (code generated, etc ..)
//
///////////////////////////////////////////////////////////////////////////////////////////

import rationalPolynomial from './rationalPolynomial.js';
import getInterpreters from './renderInterpreters.js';
import { renderSVG } from './renderSVG.js';
import symbolicOperators from './symbolicOperators.js';
import linkTranspiler from './transpile.js';

// Miniature symbolic geometric algebra implementation.
export default function Algebra(...args) {

  ///////////////////////////////////////////////////////////////////////////////////////////
  // Setup, Option Parsing, Precalculations.
  ///////////////////////////////////////////////////////////////////////////////////////////
  
  // Default options.
  var options = { p:0, q:0, r:0, CSE:true, prefetch:true, precompile:false, printPrecision:3 };
  
  // Argument processing - single string algebra shortcuts - if not recognized use it as metric string.
  if (typeof args[0] == "string") args = ({
    "2DPGA":[2,0,1,{basis:["1","e1","e2","e0","e20","e01","e12","e012"], CSE:true }],
    "3DPGA":[3,0,1,{basis:["1","e1","e2","e3","e0","e01","e02","e03","e12","e31","e23","e032","e013","e021","e123","e0123"], CSE:true }],
    "STA"  :[1,3,{startIndex:0, CSE:true}],
    "STAP" :[3,1,1,{basis:["1","e0","e1","e2","e3","e4","e01","e02","e03","e40","e12","e31","e23","e41","e42","e43","e234","e314","e124","e123","e014","e024","e034","e032","e013","e021","e0324","e0134","e0214","e0123","e1234","e01234"], CSE:true }],
    "2DCGA":[3,1],
    "3DCGA":[4,1],
  }[args[0]]||[{metric:args[0]}]).concat(args.slice(1));
  
  // Argument processing (overload pqr passed in as numbers and other options passed in as object)
  Object.assign(options, Object.fromEntries( args.filter(x => typeof x === "number").map((x,i)=>['pqr'[i],x]) ));
  Object.assign(options, ...args.filter(x => typeof x === "object"));
  
  // if metric is given in options, overload p,q,r. If given as string (with +, -, 0) first convert it to an array (with +1, -1, 0).
  if (typeof options.metric === 'string') options.metric = options.metric.split('').map(x=>(['0','+'].indexOf(x)));
  if (options.metric) [options.p, options.q, options.r] = [1,-1,0].map(x=>options.metric.filter(y=>Math.sign(x)==Math.sign(y)).length);

  // Derived options.
  options.n = options.p + options.q + options.r;
  if (!options.metric) options.metric = [...Array(options.n)].map((x,i)=>i<options.r?0:i<options.r+options.p?1:-1);

  // Default startindex is 0 if the first basis vector squares to 0, 1 otherwise.
  if (options.startIndex === undefined) options.startIndex = options.metric[0]==0?0:1;
  
  // Create basis if it was not given. (always natural/lexical ordering)
  if (!options.basis) options.basis = [...Array(2**options.n).keys()]
                                      .map((x,i)=>(i?'e':'1')+x.toString(2).split('').map((x,i,a)=>x==="1"?('0'+(a.length-i-1+options.startIndex)).slice(options.n>(10-options.startIndex??1)?-2:-1):'').reverse().join(''))
                                      .sort((a,b)=>a.length-b.length||(a<b?-1:1));

  // Natural basis is always used in our contract function (we use sorting).
  options.naturalBasis     = options.basis.map(x=>x[0]+(x.slice(1).match(options.n>(10-options.startIndex??1)?/../g:/./g)||[]).sort().join(''));
  
  // Looking up via a hash-object is a substantial speedup compared to indexOf.
  options.nbHash           = Object.fromEntries(Object.entries(options.naturalBasis).map(x=>[x[1],Number(x[0])]))
  
  // Figure out the permutation from the given basis to the natural one.
  options.basisPermutation = options.basis.map(x=>x==="1"?1:contract(x.slice(1))[0]);
  
  // Figure out the Hodge Dual basis. (e_a ^ e_b = pss)
  options.dualBasis = options.basis.map(x=>{
    var el  = contract(x.slice(1)+options.basis[options.basis.length-1].slice(1));
    var sgn = contract(options.basis[el[1]].slice(1)+x.slice(1));
    return [sgn[0],el[1]]
  });
  
  // The contraction axiom. (eiei = [+1,-1,0], eiej = -ejei)
  function contract (args) {
    if (args==='') return [1,0];
    
    // input is expected to be '1223' for e12 * e23. Split into array of basis blades.
    if (options.n <= (10-options.startIndex??1)) args = args.split(''); else {
      var nargs = []; for (var i=0, j=0, l=args.length; i<l; i+=2) nargs[j++] = args.slice(i,i+2); args = nargs;
    }
    
    // contraction axiom - removes equal basis vectors and sorts the others .
    for (var metric=1, i=0; i<args.length; ++i) for (var j=i+1; j<args.length; ++j) if (args[i] == args[j]) { 
      metric *= ((j-i-1)%2?-1:1) * (options.metric[args[i]-options.startIndex]??1);        
      args.splice(j,1); args.splice(i,1); --i; break;
    } else if (args[i] > args[j]) { metric *= ((j-i)*2-1)%2?-1:1; [args[i],args[j]] = [args[j],args[i]]; };
    
    // returns an array [metric, blade_idx] [ 0 or 1 or -1,  0->2**n-1 ] 
    var blade = !args.length?'1':'e'+args.join('');
    var idx   = options.nbHash[blade]; // options.naturalBasis.indexOf(blade);
    if (options.basisPermutation) metric *= options.basisPermutation[idx];
    return [metric||0, idx]; // changes "-0" into "0" .. aesthetic
  }
  
  // Cayley table is constructed to accelerate applying the contraction axiom.
  // we can because it is linear, distributive, associative.
  if (!options.Cayley && options.n<=8) options.Cayley = options.basis.map((a,ai)=>options.basis.map((b,bi)=>{
    return ai==0?[1,bi]:bi==0?[1,ai]:contract(a.slice(1)+b.slice(1));
  })); 

  // Grade helper variables - for involutions and grade selection. (we expect grades to be grouped!)
  options.grades     = options.basis.map(x=>(x.length-1)/(options.n>(10-options.startIndex??1)?2:1));
  options.gradeStart = [...[...Array(options.n+1).keys()].map(n=>options.grades.findIndex(x=>x==n)),2**options.n]; 
  
  // Default types. A class will be created for each type, with the given
  // name and layout. (e.g. : [{name: 'vector', layout: ["e1","e2"]}, ...])
  // For each k-vector, the rotors, study numbers and full multivectors
  // types are automatically created. 
  if (options.types === undefined) {
    if (options.flat) {
      options.types = [{name:'scalar',layout:["1"]},{name:'multivector',layout:options.basis.slice()}];
    } else {
      options.types = [...Array(options.n+1)].map((x,i)=>{
        var name   = ['scalar','vector','bivector','trivector','quadvector','pentavector','hexavector'][i]||('vector'+i);
        var layout = options.basis.slice(options.gradeStart[i],options.gradeStart[i+1]);
        return {name, layout}
      });
      if (options.p===3 && options.r === 1) options.types.push({name:'direction',layout:[...options.basis.slice(options.gradeStart[3],options.gradeStart[3+1]-1)]});
      if (options.n >= 2) options.types.push({name:'study',layout:[options.basis[0],options.basis[2**options.n-1]]});
      if (options.n >= 2) options.types.push({name:'rotor',layout:options.basis.filter(x=>x.length%2===1)});
      options.types.push({name:'multivector',layout:options.basis.slice()});
    }
  }  
  
  // Setup coefficient operations. The GA implemented below uses the coefficient type for each of its
  // coefficients and expects .add, .mul, .neg, .inv, .cse, .format methods to be available on the coefficients.
  var coefficient = rationalPolynomial;
  class symElement extends Array { constructor (...vals) { super(...vals); } }; 
 
  // Get the symbolic implementation on multivectors.
  // Note that some of these (most notable inv and sqrt) are limited to Study numbers only!
  const allOperators = symbolicOperators(coefficient, options, contract, /**@type ArrayConstructor */(symElement));
  const {gp, ip, lp, rip, op, dual, undual, reverse, involute, customInvolute, conjugate, add, sub, inv, abs, sqrt, grade, gradeOf, create, type} = allOperators;
  
  // For each type GAmphetamine will generate a class, with a list of methods defined on each class element.
  // The default list of methods is given below, and it extends the simple operators defined in allOperators to
  // include e.g. the sandwich commutator and other operations.
  //
  // Subtle .. for symbolic integration, names 'a' and 'b' below must represent multivectors, while other
  // names must not. GAmphetamine will only 'upcast' arguments called 'b', and always upcasts 'this'.
  //
  if (options.methods instanceof Function) options.methods = options.methods(allOperators);
  options.methods = Object.assign((options.methods == undefined)?{}:options.methods,{
    // these basic methods are implemented fully symbolically and forwarded to all classes.
    // see symbolicOperators.js for their implementation.
    add, sub, gp, op, ip, lp, rip, reverse, involute, conjugate, dual, undual, customInvolute,
    // some extra methods are really just combinations of basic ones, but we create optimised versions.
    // these are executed symbolically, but can return undefined to rely on numerical fallbacks below.
    prj            : (a,b)=>gp(ip(a,b),reverse(b)),
    rp             : (a,b)=>undual(op(dual(a),dual(b))),
    cp             : (a,b)=>gp([0.5],sub(gp(a,b),gp(b,a))),
    norm           : a=>sqrt(abs(gp(a,reverse(a)))),
    normalized     : a=>gp(a,inv(sqrt(gp(a,reverse(a))))??[0]),
    sqrt           : a=>sqrt(a),
    // The sandwich product with correct signs. (assumes a is either odd or even! - no spinors)
    sw             : (a,b)=>grade(gp(gp(a,gradeOf(a)%2==1?involute(b):b), reverse(a)),gradeOf(b)),
    // For PGA's, we provide a default camera projection.
    cprj           : a=>{ 
       if (options.n <= 3 || options.flat) return a; const n = options.n-3;
       // set a camera to !(1e0 + 5e3 + 5e4 + ...).Normalized, and a camera plane to (1e3 + 1e4 + ...).
       const camera = create("vector", Array(options.n).fill( (((options.perspective??5)*n)**.5/n)**2*n ));
       const plane  = create("vector", Array(options.n).fill( ((1*n)**.5/n)**2*n ));
       // We keep the camera as vector here instead of dualizing extra for the regressive product we need next
       // so we just set the !e0 coefficient to 1, and make sure !e1 and !e2 are zero.
       camera[options.basis.indexOf('e0')] = 1; camera[options.basis.indexOf('e1')] = camera[options.basis.indexOf('e2')] = 0;
       // For the camera hyperplane, we have e0=e1=e2=0. 
       plane[options.basis.indexOf('e0')] = plane[options.basis.indexOf('e1')] = plane[options.basis.indexOf('e2')] = 0;
       // Now join and wedge with the camera and plane to be left with an mv in the e012 subspace
       return op(undual(op(camera, dual(a))),plane);                            // (camera v a) ^ plane
    },
    // Some inverses are worked out symbolically (others are calculated numerically)
    inverse        : a=>{
      const sq = gp(a,reverse(a)), gsq = gradeOf(sq), t=type(sq);
      // If multiplying with the reverse produces a scalar, the inverse is trivial. (e.g. all blades)
      if (gsq == 0) return gp( reverse(a), inv(sq) ); 
      // In 3D, a*rev(a)*inv(a) is always scalar, with again a trivial inverse.
      if (options.n <= 3) { var adjugate = gp(reverse(a),involute(sq)); return gp(adjugate, inv(gp(a, adjugate))); }
      // In 4D, a similar construction is possible, but often only needed for general mv's
      if (options.n === 4) { 
        // in many cases, the product a*rev(a) will be a study number, still easy to invert.
        if (t.name == 'study' && options.r==1) return gp( inv(sq), reverse(a) ); 
        // else, use a custom involution to find the adjugate.
        var adjugate = gp(conjugate(a), customInvolute( gp(a,conjugate(a)), [3,4] ) ); 
        return gp(adjugate, inv(gp(a, adjugate))); 
      }
      return undefined; // will be resolved numerically.
    },
  });

  ///////////////////////////////////////////////////////////////////////////////////////////
  // Symbolic Classes Setup
  ///////////////////////////////////////////////////////////////////////////////////////////
  
  // Helper for formatting basis names.
  const formatBasis = x=>options.printFormat != "latex" ?x.replace(/e(\d+)/g,a=>" e"+a.slice(1).split('').map(x=>String.fromCharCode(0x2080+(x*1))).join('')) 
                                                        :x.replace(/e(\d+)/g,a=>"\\mathbf e_{"+a.slice(1)+"}");

  const formattedBasis = options.basis.map(x=>formatBasis(x));

  // For interaction between numeric and symbolic implementations, numerical multivectors need to be casted to symbolic ones.
  // This is what toSym does. upSym converts also plain numbers and strings while downsym looks up the propper type.
  const toSym   = (a)=>(a.__proto__.constructor.name=='scalar'||typeof a==='number')?new options.symClasses.scalar(1*a):new options.symClasses[a.__proto__.constructor.name](...a.map(x=>1*x==x?1*x:x));
  const upSym   = b=>{ if (typeof b == 'number' || typeof b == 'string') b=[b,...Array(2**options.n-1).fill(0)]; if (!(b instanceof Array)) b=toSym(b); return b;  }
  const downSym = r=>{ if (r===undefined) return r; var t = type(r); var res = new options.symClasses[t.name](); res.splice(0,res.length, ...r); return res; }
  
  // Symbolic classes. A matching symbolic class is made for each type. When numeric and symbolic multivectors are combined,
  // the result will always be symbolic, and stored flat. (although it will retain valid typing).
  options.symClasses = Object.fromEntries(options.types.map((x,i)=>{
    // Create a named class. The only way to do this is with new Function. The constructor must also be implemented there for access to the 'super' keyword.
    // Other functions are added below.
      var c = new Function(`symElement`,`return class ${x.name} extends symElement {
        constructor (...vals) { 
          super(${2**options.n}); this.fill(0); 
          if (vals.length === 1 && ${x.layout.length} !== 1) vals = [...Array(${x.layout.length})].map((x,i)=>vals[0]+(i+(${options.startIndex||0}))+({"{":"}","[":"]","(":")"}[vals[0][vals[0].length-1]]||'')); 
          ${x.layout.map(x=>options.nbHash[x]||options.basis.indexOf(x)).map((x,i)=>'this['+x+'] = vals['+i+']').join('\n')}
        }       
      }`)(symElement);
    // Add all basic binary and unary operators to work on the symbolic (flat, but types are recognized!) versions.
    // fallback to static functions if symbolic support is limited or slow. This happens when you ask things like complex inverses where the
    // default strategy is to fall back to numerical methods.   
      Object.entries(options.methods).forEach(([m,f])=>{
        const vars = f.toString().match(/\((.*?)\)[={ ]|(.*?)=/).filter(x=>x).pop().split(',');
        c.prototype[m] = f.length == 2 && vars[1] == 'b' ? function(b) { var r = f( this, upSym(b) ); if (r===undefined) r=Element[m]( this, upSym(b) ); return downSym(r);  }:
                                          f.length == 2  ? function(b) { var r = f( this, b ); if (r===undefined) r=Element[m]( this, b ); return downSym(r);  }
                                                         : function()  { var r = f( this ); if (r===undefined) r=Element[m]( this ); return downSym(r);  }
      });
    // Grade selection is seperate
      c.prototype.grade = function(g) { var r = [...this.map((x,i)=>g==options.grades[i]?x:0)]; return downSym(r);}
    // Formatting multivectors as pretty strings.
      c.prototype.toString = function() { return [...this].map(x=>x===0?'':coefficient.format(x)).map((x,i)=>x==0?0:((''+x).match(/^-?.+[-+*].*/)?'('+x+')':x)+(i==0?'':formattedBasis[i])).filter(x=>x).join(' + ').replace(/[+] -/g,'- ')||'0'; }  
    // Add type indexes for the lookup tables.
      c.prototype.tp = options.types.length;
    return [x.name,c];
  }))

  ///////////////////////////////////////////////////////////////////////////////////////////
  // Numerical Classes Setup
  ///////////////////////////////////////////////////////////////////////////////////////////
  
  // The master base classes, for multivector and number types.
  class Element  extends (options.baseType||Float32Array) { constructor (...vals) { super(...vals); } };
  class ElementN extends Number                           { constructor(val=0){ super(val); } };
  
  // A static link allows e.g. fallback implementations for operators to access algebra options.
  Element.options = options; options.Element = Element;

  // Now generate a named class for each type, using Element as baseclasss and ElementN for the scalars.
  // All other methods are generated later by the jit function, and are added to these classes dynamically.
  options.classes = Object.fromEntries(options.types.map((x,i)=>{
    // Create a named class.
    if (x.name=='scalar') 
      var c = new Function('ElementN',`return class ${x.name} extends ElementN { constructor (val) { super(val); } }`)(ElementN);
    else 
      var c = new Function('Element',`return class ${x.name} extends Element {
        constructor (...vals) { super(${x.layout.length}); if (vals[0] instanceof Array) this.set(vals[0]); else this.set(vals); }
        toString () { return [...this].reduce((s,x,i)=>{ if (Math.abs(x) > ${10**-options.printPrecision}) s += (s&&' + ') + x.toFixed(${options.printPrecision}) + (${JSON.stringify(x.layout.map(x=>x=='1'?'':formatBasis(x)))}[i]); return s; }, '').replace(/\.000e|0+e/g,'e').replace(/[+] -/g,'- ')||0; }
      }`)(Element);
    // Add type indexes for the lookup tables. 
    c.prototype.tp = i;
    // Add getters/setters for basis blades.
    options.basis.forEach((blade, bi)=>{
      const basis_in_layout = x.layout.indexOf(blade);
      if (basis_in_layout >= 0) {
        if (blade == "1" && i == 0)  Object.defineProperty(c.prototype, "s", {
          get: function() { return this; },
          set: function(value) { throw(new Error('Cannot write scalar value of scalar like this.')); }
        });
        else {
          Object.defineProperty(c.prototype, blade==="1"?"s":blade, {
            get: function() { return this[basis_in_layout]; },
            set: function(value) { this[basis_in_layout] = value; }
          }); 
          if (blade != options.naturalBasis[bi]) Object.defineProperty(c.prototype, blade==="1"?"s":options.naturalBasis[bi], {
            get: function() { return options.basisPermutation[bi] * this[basis_in_layout]; },
            set: function(value) { this[basis_in_layout] = options.basisPermutation[bi] * value; }
          }); 
        }
      } else Object.defineProperty(c.prototype, blade == "1"?"s":blade, {
          get: function() { return 0; },
          set: function(value) { throw(new Error( `[${blade}] blade does not exist in type [${x.name}]`)); }
        });  
    })
    return [x.name,c];
  }))

///////////////////////////////////////////////////////////////////////////////////////////
  // Numerical Fallback. Everything that does not get compiled down to efficient coefficient
  // expressions can still be resolved - often with iterative or conditional numerical 
  // algorithms. 
  ///////////////////////////////////////////////////////////////////////////////////////////

  // Fallback functions are implemented in GA lingo. They are used if the symbolics return undefined.
  ElementN.inverse = x=>1/x;
  Element.inverse = function(x) {
    if (x === undefined) return x;
    if (options.n <= 5) {
      const [c,i,r] = [x.conjugate(), x.involute(), x.reverse()];
      const cir = c.gp(i).gp(r); 
      const adjugate = cir.gp( x.gp(cir).customInvolute([1,4]) );
      return adjugate.gp(1/x.gp(adjugate)[0]);
    }  
    // Shirokov inverse.
    for (var N=2**(((options.n+1)/2)|0), Uk=x, k=1; k<N; ++k) {
      var adjU = Uk.sub( Uk.grade(0).gp(N/k) );
      Uk = x.gp(adjU);
    }
    Uk[0] = 1/Uk[0];
    return adjU.gp(Uk);
  };

  // Grade selection
  Element.prototype.grade = function(n) {
    return new options.classes[options.types[n].name](...options.types[n].layout.map(x=>this[options.types[this.tp].layout.indexOf(x)]).map(x=>x===undefined?0:x));
  }
  
  // Invariant Split
  Element.prototype.split = function() {
    if (options.n < 4) return [this];
  // We single out small PGA style algebras.
    if (options.n < 6 && options.r == 1 && options.q == 0) {
      const B = this, BB = B.ip(B);
      // If we square to zero, we are a pure translation bivector.
      if (BB==0) return [B]
      // If not, the bivector that corresponds to the translation is easy to find:
      var b2 = Element.div(B.op(B),B.gp(2));
      // And the remainder corresponds to the rotation.
      var b1 = B.sub(b2);
      return [b1,b2];
    }
  // Now solve the general case. (see https://www.researchgate.net/publication/353116859_Graded_Symmetry_Groups_Plane_and_Simple)
    var k = Math.floor(options.n / 2), B = this, m = 1;
    var Wi = [...Array(k)].map((r,i)=>{ m = m*(i+1); var Wi = B.gp(1/m); B = B.op(this); return Wi; });
    if (k<3) { // The quadratic case is easy to solve. (for spaces <6D)
      var TDT    = this.ip(this), TWT = this.op(this);
      if (TWT.norm() < 1E-5) return [this]; // bivector was simple.
      var D      = 0.5*Math.sqrt( TDT**2 - TWT.ip(TWT) );
      var eigen  = [0.5*TDT + D, 0.5*TDT - D].sort((a,b)=>Math.abs(a)<Math.abs(b)?-1:1); 
    } else { // For >=6D, closed form solutions of the characteristic polyn. are impossible.
      eigen = [];
    }  
    Wi = [Element.scalar(1),...Wi,Element.scalar(0)];
    var sum = Element.scalar(0), res = eigen.slice(1).map(v=>{
      var r = Math.floor(k/2), N = Element.scalar(0), DN = Element.scalar(0);
      for (var i=0; i<=r; ++i) { N=Element.add(N, Wi[2*i+1].gp(v**(r-i))); DN=Element.add(DN, Wi[2*i].gp(v**(r-i))); }
      if (DN.norm() == 0) return Element.scalar(0);
      var ret = Element.div(N,DN); sum = Element.add(ret, sum); return ret;
    });
    return [this.sub(sum),...res]; // Smallest eigvalue becomes B-rest
  }
  
  // Invariant Decomposition
  Element.prototype.factorize = function() {
    // PGA style algebras (n,0,1) < 6D are easy and fast ..
    if (options.n < 6 && options.r == 1 && options.q == 0) {
      var x = this;
      // If it is simple, we have just one factor.
      if (x[x.length-1] == 0) return [x];
      // Else decompose into translation and rotation.
      var translation = Element.div(x.grade(4),x.grade(2)).add(1);
      var rotation    = x.gp(translation.reverse());
      return [rotation, translation]
    }
    // Solve the general case.
    var S = this.grade(2).split(), P = this;
    var R = S.slice(0,S.length-1).map((Si,i)=>{
      var Mi    = Si.add(P[0]); 
      var scale = Math.sqrt(Mi.reverse().gp(Mi)[0]);
      return Mi.gp(1/scale); 
    });
    R.push( R.reduce((tot,fact)=>tot.gp(fact.reverse()), Element.scalar(1)).gp(P) );
    return R;
  }
  
  // Exp
  ElementN.prototype.exp = function() { return Math.E**Number(this); }
  Element.prototype.exp = function() {
    return this.grade(2).split().reduce((total,simple)=>{
      var square = simple.ip(simple), len = Math.sqrt(Math.abs(square));
      if (len <= 1E-5) return total.gp(Element.scalar(1).add(simple));
      if (square <  0) return total.gp(Element.scalar(Math.cos(len)).add(simple.gp(Math.sin(len)/len)) );
      return total.gp(Element.scalar(Math.cosh(len)).add(simple.gp(Math.sinh(len)/len)) );
    },Element.rotor(1));
  }
  
  // Log
  Element.prototype.log = function() {
    if (options.n < 6 && options.r == 1) {
      return this.factorize().reduce((B,ri)=>{
        var [ci,si] = [ri[0], ri.grade(2)];
        var square = si.gp(si)[0];
        var len = Math.sqrt(Math.abs(square));
        if (Math.abs(square) < 1E-5) return B.add(si);
        if (square < 0) return B.add(si.gp(Math.acos(ci)/len));
        return B.add(si.gp(Math.acosh(ci)/len));
      },new options.classes.bivector());
    }
  }
  
  // Compiler helpers - symbolic multivectors for arguments a and b of any type.
  var symvars = [...Array(10).keys()]
                .map(i=>String.fromCharCode(97+i))
                .map(varname=>options.types.map(a=>create(a.name, varname)));

  // Create a compile method for this function
  function jit(func, tp, table, name=func.name??'', a, b, r) {
    
    const count = func.length;
    tp = tp.map( tp => tp.tp??tp );
    if (tp[1] === undefined) tp[1] = 0;

    // perform symbolic operation.
    var AB = func( ...symvars.slice(0, count).map((x,i)=>x[tp[i]]) ); //(count==1)?func(A[tp[0]]):func(A[tp[0]],B[tp[1]]);
    
    // Support fallback. If the symbolic function above yielded undefined, fallback
    // to numerical methods where available and link the fallback.
    if (AB === undefined) {
      /** @type {Function} */
      var f = (count == 1) ? (A,R)=>Element[name](A,R)
                            : (A,B,R)=>Element[name](A,B,R);
      table[tp[0]][tp[1]] = f;
      return a===undefined?f:f(a,b,r);
    }
    
    // figure out outuput type
    var outputType = type(AB);
    if (!options.precompile && options.debug) console.log('compile',name,'for',options.types[tp[0]].name,count==1?'':options.types[tp[1]].name, '->', outputType.name);
    
    // reduce expression to output type
    var expr = outputType.layout.map(x=>AB[options.basis.indexOf(x)]);
    
    // CSE
    /** @type any */
    var prelude = [];
    if (options.CSE) [prelude, expr] = coefficient.cse(expr, symvars[1][tp[1]].filter(x=>x));

    // format expressions
    var expr = expr.map(x=>coefficient.format(x));

    // prefetch coefficients. (make exceptions for add and sub where its never a win)
    const prefetch = options.prefetch && name!='add' && name!='sub';
    if (prefetch) 
      prelude = [ ...tp.map((x,i)=>x==0?[]:[...symvars[i][tp[i]]].filter(x=>x).map(x=>x.replace(/\[|\]/g,'')+'='+x)).flat(),
                  ...prelude.map(x=>x.replace(/\[|\]/g,'')) ];
        
    // create the actual function
    /** @type string */
    prelude = prelude.length==0?'':'  const '+prelude.join(',')+';\n';
    if (outputType.name == 'scalar') {
      if (prefetch)
        var src = prelude + (expr.map((x,i)=>x==0?undefined:'return '+(x+'').replace(/\[|\]/g,'')+';\n  ').join('')||"return 0") + '';
      else
        var src = prelude + expr.map((x,i)=>x==0?undefined:'return '+x+';\n  ').join('') + '';
      /** @type {Function} */  
      var f = new Function('classes',`return function ${name}_${options.types[tp[0]].name}${func.length>1?'_'+options.types[tp[1]].name:''} (${['a','b','c','d','e','f','g','h'].slice(0, func.length).join(',')}) {\n${src}\n} `)(options.classes);
    } else {
      if (prefetch)
        var src = prelude + expr.map((x,i)=>x==0?undefined:'  res['+/*'ofs+'+*/i+']='+(x+'').replace(/\[|\]/g,'')+';\n').join('')+"  return res;"
      else
        var src = prelude + expr.map((x,i)=>x==0?undefined:'  res['+/*'ofs+'+*/i+']='+x+';\n').join('')+"  return res;"
      /** @type {Function} */  
      var f = new Function('classes',`return function ${name}_${tp.slice(0,count).map(x=>options.types[x].name).join('_')} (${['a','b','c','d','e','f','g','h'].slice(0, func.length).join(',')+',res=new classes.'+outputType.name+'()'/*+', ofs=0'*/}) {\n${src}\n} `)(options.classes);
    }  
    
    // Store for next time..
    if (table) table[tp[0]][tp[1]] = f;
    
    // statistics.
    if (options.debug) {
      options.generated_loc = (options.generated_loc || 0) + f.toString().split('\n').length;
      options.generated_functions = (options.generated_functions || 0) + 1;
      options.all = (options.all||'')+ f.toString()+'\n\n';
    }
    
    // return the function or its result.
    return a===undefined?f:f(a,b,r);
  }
  Element.jit = jit;
  
  // Add functions to classes. For each function on each class, we hold a jumptable that contains
  // precompiled versions for each possible type combination. At startup these tables are initialised
  // with the proper compilation calls.
  Object.entries(options.methods).forEach(([name, func],mi,ma)=>{
    // Create a lookup table for each method
    //var table = new Array((ma.length+1)**2);
    var table = [...Array(ma.length)].map(x=>Array(ma.length));
    options.methods[name].table = table;
    
    // Fill in the lookup table.
    for (var i=0, l=options.types.length; i<l; ++i) for (var j=0; j<l; ++j) {
      table[i][j] = options.precompile?jit.bind(this, func,[i,j],table,name)():jit.bind(this,func,[i,j],table,name);
      if (func.length==1) break;
    }
    
    // Support symclasses interaction. They take up the extra spot in each table.
    for (var i=0, l=options.types.length; i<l; ++i) {
      table[options.types.length][i] = function(a,b) { return toSym(a)[name](b); }
      table[i][options.types.length] = function(a,b) { return a[name](toSym(b)); }
    }  
    
    // Add the method to all classes
    for (let j in options.classes) {
      let tpA = options.classes[j].prototype.tp|0;
      let ta = table[tpA];
      options.classes[j].prototype[name] =  (func.length==1) ? function(R)  { return ta[0](this,R); }
                                                             : function(B,R=undefined){ return ta[B.tp||0](this,B,R); }
    }                                                         
  })
 
  
  // Constructing elements of various types can be done using static functions on the Element
  // base class.
  
  /** Create a multivector from a given coefficient. It will return a multivector of the smallest
   *  type that contains the given blade. 
   *  @param {String} blade - e.g. 'e12' 
   *  @param {Number} coeff - the coefficient 
   *  @returns {Object} multivector of the correct class type.
   */
  Element.coeff = function (blade, coeff) {
    var perm = contract(blade.slice(1));
    blade = options.basis[perm[1]];
    var type = options.types.filter(x=>x.layout.indexOf(blade)!=-1).sort((a,b)=>a.layout.length-b.layout.length)[0];
    if (type) {
      var name = type.name;
      var idx  = type.layout.indexOf(blade);
      var val  = new options.classes[name]();
      if (name !== 'scalar') val[idx] = perm[0]*coeff; else val = perm[0]*coeff;
      return val;
    };
    return 0; 
  }

  /** Create an typed multivector given a set of coefficients. 
   *  @param {Number} n - the index of the type to create, (i.e. grade of the vector to create.) 
   *  @param {...Number|String} vals - the coefficients as number or string. (strings will result in symbolic multivectors) 
   *  @returns {Object} multivector of the correct class type.
   */
  Element.nVector = function(n, ...vals) {
    var type    = options.types[n].name;
    var classes = vals.find(x=>typeof x === "string") ? options.symClasses:options.classes;
    return new classes[type](...vals.map(x=>Number(x)==x?Number(x):x));
  }

  // For each type, we create the appropriate constructor.
  options.types.forEach((x,i)=>Element[x.name] = (...v)=>Element.nVector(i,...v));

  ///////////////////////////////////////////////////////////////////////////////////////////
  // Graph handling.
  ///////////////////////////////////////////////////////////////////////////////////////////

  const {interpretePGA} = getInterpreters(options);
  options.interprete = {interpretePGA}[options.interpreter] ?? interpretePGA;
  options.render     = {renderSVG}[options.renderer] ?? renderSVG;

  Element.graph = function(list, Goptions = {}) {
    Goptions.updateCam = ()=>{ if (options.n <= 3) return;
      var [ch,sh,cp,sp] = [Math.cos(Goptions.h??0), Math.sin(Goptions.h??0), Math.cos(Goptions.p??0), Math.sin(Goptions.p??0)];
      var R1 = options.Element.scalar(ch).add(options.Element.coeff("e13", sh));
      var R2 = options.Element.scalar(cp).add(options.Element.coeff("e23", sp));
      if (options.n >= 5) {
        var [ch,sh,cp,sp] = [Math.cos(Goptions.h2??0), Math.sin(Goptions.h2??0), Math.cos(Goptions.p2??0), Math.sin(Goptions.p2??0)];
        var R3 = options.Element.scalar(ch).add(options.Element.coeff("e14", sh));
        var R4 = options.Element.scalar(cp).add(options.Element.coeff("e24", sp));
        Goptions.autoCamera = R4.gp(R3).gp(R2).gp(R1);
      } else {
        Goptions.autoCamera = R2.gp(R1);
      }
    }
    var result;
    // interaction and animation. 
    function update() {
      if (result && !result.parentElement) return;
      // first resolve to a list of actual items to render.
      var items = (list instanceof Function) ? list():list;
      if (Goptions.h !== undefined || Goptions.p !== undefined) Goptions.updateCam();  
      if (!(items instanceof Array)) throw(new Error("Graph expects a list of elements to render."));
      // now pass this list of items to the interpreter.
      var drawitems = options.interprete(items, options, Goptions);
      // next, pass this list of items to the renderer.
      result = options.render(drawitems, options, Goptions, result);
      // setup an update call.
      result.movePoint = (idx, x, y)=>{
         if (idx > 0 && items[idx]?.set) {
           const cam = Goptions.camera || Goptions.autoCamera;
           var v = (cam?cam.sw(items[idx]):items[idx]).undual(); v.e1 = x / (Goptions.scale??1); v.e2 = y / (Goptions.scale??1); // v.e0 = 1;
           if (items[idx].set) items[idx].set(cam?cam.reverse().sw(v.dual()):v.dual());
         }  
         if (!Goptions.animate) update();
      }
      // if we are animating, shedule update
      result.onwheel = e=>{ e.preventDefault(); Goptions.scale = Math.max(0.001,(Goptions.scale??1) * (1-e.deltaY/5000)); if (!Goptions.animate) update(); }
      if (Goptions.animate) requestAnimationFrame(update); 
      return result;
    } 
    // render the first time.   
    return update();
  }

  ///////////////////////////////////////////////////////////////////////////////////////////
  // Inline syntax and transpiler support.
  ///////////////////////////////////////////////////////////////////////////////////////////
  linkTranspiler(Element, symElement, options);

  ///////////////////////////////////////////////////////////////////////////////////////////
  // Some common utilities. Consider isolating these.
  ///////////////////////////////////////////////////////////////////////////////////////////
  if (options.r == 1) Element.hypercube = Element.inline(options=>(opts={})=>{
      if (typeof opts==='number') opts = {size:opts, colors:true};
      const size = opts.size??0.5;
      const d = opts.d??options.p;
      // Create a hypercube (square in 2D, cube in 3D, ...)
      // Start by defining its vertices. We have 2**d of them 
      const p = [...Array(2**d)]                         
              .map((x,i)=>i.toString(2))                                          // [0, 1, 10, 11, 100, ...]
              .map(x=>(Array(options.n).fill('0').join('')+x).slice(-d))          // [000, 001, 010, 011, ...]
              .map(x=>x.split('').map(x=>Number(x)-0.5))                          // [[-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], ...]
              .map(x=>!(1e0 + size*/**@type any*/(x)*/**@type any*/([1e1,1e2,1e3,1e4,1e5,1e6,1e7,1e8,1e9].slice(0,d))))  // PGA points are dual vectors.
      
      // Now consider all vertex pairs and create edges for those
      // pairs that differ only in one coordinate. We'll find d * 2**(d-1) edges.
      const e = p.map((a,i)=>p.map((b,j)=>
                  i<=j||(i^j)&(i^j-1)?0:[i,j]             // note that &,^ here are bitwise ops since i,j are integer
                )).flat().filter(x=>x)
                .sort((a,b)=> (a[0]^a[1])-(b[0]^b[1]) );  // now sort all those that are in the same principal axis together.
      
      // For the faces, we'll just loop and collect.
      // The total number of faces is 2**(d-3) per combination of 2 basis vectors. i.e. (d * (d-1))/2 * 2**(d-2) = d * (d-1) * 2**(d-3)
      const cols = [...Array(8).keys()].map(x=>(255-parseInt(('00000000'+(x).toString(2)).slice(-8).split('').reverse().join(''),2)))
                                       .map(x=>[x*0x010000, x*0x0100, x, x*0x0101, x*0x010001, x*0x010100]).flat();
      //@ts-ignore
      var f = e.map(([x1,y1],i)=>e.map(([x2,y2],j)=>{
        var b1 = x1^y1, b2 = x2^y2, b3 = (x1|b1)^(x2|b2), b4 = b3&(b3-1);
        if (i>j && b1==b2 && y1<x2 && b4==0) return opts.indices?[x1,y1,y2,x2]:[p[x1],p[y1],p[y2],p[x2]];
      })).flat().filter(x=>x).map((x,i)=>opts.colors?[cols[i%cols.length],x]:[x]).flat();
    
      return [p,e.map((q)=>opts.indices?q:[p[q[0]],p[q[1]]]), f];
  })(options);

  if (args[args.length-1] instanceof Function) return Element.inline(args[args.length-1]).apply(Element);
    
  return Element;  
}