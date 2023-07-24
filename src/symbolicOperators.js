// @ts-check
///////////////////////////////////////////////////////////////////////////////////////////
//
// This file implements the core symbolic geometric algebra operations. It in turn drives
// the code generation that powers GAmphetamine. 
//
// It implements various GA operations, making sure that all coefficient manipulations
// can happen with any object that implements the required (minimal) interface. See
// rationalPolynomial.js for an example. 
//
///////////////////////////////////////////////////////////////////////////////////////////

export default function symbolicOperators(coefficient, options, contract, symElement = Array) {

  // Create a flat symbolic multivector of a given type
  /** @type {function(string|any, string|any): array} */
  var create = (type, name)=>{
    var res    = options.symClasses?.multivector?new options.symClasses.multivector().fill(0):new symElement(2**options.n).fill(0);
    res.tp     = options.types.length;
    var type   = options.types[type] || options.types.find(x=>x.name === type);
    var layout = type.layout.map(x=>options.nbHash[x] || options.basis.indexOf(x));
         if (typeof name === "number") res[0] = name;
    else if (!(name instanceof Array)) layout.forEach((x,i)=>res[x]=name+((type.name=='scalar')?'':'['+i+']'));
                                  else layout.forEach((x,i)=>res[x]=name[i]);
    return res;
  }
  
  // Identify the type of a multivector. (the smallest matching type that can contain all coefficients)
  /** @type {function(array):object} */
  var type = x=>options.types.filter(y=>x.find((z,i)=>z!==0 && y.layout.indexOf(options.basis[i]) === -1)===undefined).sort((a,b)=>a.layout.length-b.layout.length)[0];
 
  // Geometric Product.
  /** @type {function(array, array, array=): array} */
  var gp = (a,b,res = new symElement(2**options.n).fill(0))=>{
    for (var i=0, li=a.length; i<li; ++i) {
      if (a[i] == 0) continue;
      for (var j=0, lj=b.length; j<lj; ++j) {
        if (b[j] == 0) continue;
        var [metric, idx] = i==0?[1,j]:j==0?[1,i]:options.Cayley instanceof Array?options.Cayley[i][j]:contract(options.basis[i].slice(1)+options.basis[j].slice(1)); 
             if (metric === 1) res[idx] = coefficient.add(res[idx]||0, coefficient.mul( a[i], b[j] ));
        else if (metric ===-1) res[idx] = coefficient.add(res[idx]||0, coefficient.neg(coefficient.mul( a[i], b[j] )));
        else if (metric !== 0) res[idx] = coefficient.add(res[idx]||0, coefficient.mul( metric, coefficient.mul( a[i], b[j] )));
      }
    }
    return res;
  }

  // Symmetric Inner Product.
  /** @type {function(array, array, array=): array} */
  var ip = (a,b,res = new symElement(2**options.n).fill(0))=>{
    for (var i=0, li=a.length; i<li; ++i) {
      if (a[i] == 0) continue;
      for (var j=0, lj=b.length; j<lj; ++j) {
        if (b[j] == 0) continue;
        var [metric, idx] = i==0?[1,j]:j==0?[1,i]:options.Cayley instanceof Array?options.Cayley[i][j]:contract(options.basis[i].slice(1)+options.basis[j].slice(1));
        if (Math.abs(options.grades[i]-options.grades[j]) != options.grades[idx]) continue;
             if (metric === 1) res[idx] = coefficient.add(res[idx]||0, coefficient.mul( a[i], b[j] ));
        else if (metric ===-1) res[idx] = coefficient.add(res[idx]||0, coefficient.neg(coefficient.mul( a[i], b[j] )));
        else if (metric !== 0) res[idx] = coefficient.add(res[idx]||0, coefficient.mul(metric, coefficient.mul( a[i], b[j] )));
      }
    }  
    return res;
  }

  // Left Contraction
  /** @type {function(array, array, array=): array} */
  var lp = (a,b,res = new symElement(2**options.n).fill(0))=>{
    for (var i=0, li=a.length; i<li; ++i) {
      if (a[i] == 0) continue;
      for (var j=0, lj=b.length; j<lj; ++j) {
        if (b[j] == 0) continue;
        var [metric, idx] = i==0?[1,j]:j==0?[1,i]:options.Cayley instanceof Array?options.Cayley[i][j]:contract(options.basis[i].slice(1)+options.basis[j].slice(1));
        if (options.grades[j]-options.grades[i] != options.grades[idx]) continue;
             if (metric === 1) res[idx] = coefficient.add(res[idx]||0, coefficient.mul( a[i], b[j] ));
        else if (metric ===-1) res[idx] = coefficient.add(res[idx]||0, coefficient.neg(coefficient.mul( a[i], b[j] )));
        else if (metric !== 0) res[idx] = coefficient.add(res[idx]||0, coefficient.mul(metric, coefficient.mul( a[i], b[j] )));
      }
    }  
    return res;
  }

  // Right Contraction
  /** @type {function(array, array, array=): array} */
  var rip = (a,b,res = new symElement(2**options.n).fill(0))=>{
    for (var i=0, li=a.length; i<li; ++i) {
      if (a[i] == 0) continue;
      for (var j=0, lj=b.length; j<lj; ++j) {
        if (b[j] == 0) continue;
        var [metric, idx] = i==0?[1,j]:j==0?[1,i]:options.Cayley instanceof Array?options.Cayley[i][j]:contract(options.basis[i].slice(1)+options.basis[j].slice(1));
        if (options.grades[i]-options.grades[j] != options.grades[idx]) continue;
             if (metric === 1) res[idx] = coefficient.add(res[idx]||0, coefficient.mul( a[i], b[j] ));
        else if (metric ===-1) res[idx] = coefficient.add(res[idx]||0, coefficient.neg(coefficient.mul( a[i], b[j] )));
        else if (metric !== 0) res[idx] = coefficient.add(res[idx]||0, coefficient.mul(metric, coefficient.mul( a[i], b[j] )));
      }
    }  
    return res;
  }

  // Outer Product.
  /** @type {function(array, array, array=): array} */
  var op = (a,b,res = new symElement(2**options.n).fill(0))=>{
    for (var i=0, li=a.length; i<li; ++i) {
      if (a[i] == 0) continue;
      for (var j=0, lj=b.length; j<lj; ++j) {
        if (b[j] == 0) continue;
        var [metric, idx] = i==0?[1,j]:j==0?[1,i]:options.Cayley instanceof Array?options.Cayley[i][j]:contract(options.basis[i].slice(1)+options.basis[j].slice(1));
        if (options.grades[i]+options.grades[j] != options.grades[idx]) continue;
             if (metric === 1) res[idx] = coefficient.add(res[idx]||0, coefficient.mul( a[i], b[j] ));
        else if (metric ===-1) res[idx] = coefficient.add(res[idx]||0, coefficient.neg(coefficient.mul( a[i], b[j] )));
        else if (metric !== 0) res[idx] = coefficient.add(res[idx]||0, coefficient.mul(metric, coefficient.mul( a[i], b[j] )));
      }
    }  
    return res;
  }
  
  // dual
  /** @type {function(array, array=): array} */
  var dual = (a, res = new symElement(2**options.n).fill(0))=>{
    //@ts-ignore
    if (!(a instanceof symElement)) a = new options.symClasses[a.__proto__.constructor.name](...a.map(x=>1*x==x?1*x:x));
    for (var i=0, li=2**options.n; i<li; ++i) {
      var d = options.dualBasis[i];
      res[i] = d[0] < 0 ? coefficient.neg(a[d[1]]) : a[d[1]];
    }
    return res;
  }
  
  // undual
  /** @type {function(array, array=): array} */
  var undual = (a, res = new symElement(2**options.n).fill(0))=>{
    //@ts-ignore
    if (!(a instanceof symElement)) a = new options.symClasses[a.__proto__.constructor.name](...a.map(x=>1*x==x?1*x:x));
    for (var i=0, li=2**options.n; i<li; ++i) {
      var d = options.dualBasis[i];
      res[i] = options.dualBasis[d[1]][0] < 0 ? coefficient.neg(a[d[1]]) : a[d[1]];
    }
    return res;
  }

  // Reversion 0 0 1 1  
  /** @type {function(array, array=): array} */
  var reverse = (a, res = new symElement(2**options.n).fill(0))=>{
    for (var i=0, li=a.length; i<li; ++i) res[i] = options.grades[i] & 2 ? coefficient.neg(a[i]) : a[i];
    return res;
  }

  // Involution 0 1 0 1 
  /** @type {function(array, array=): array} */
  var involute = (a, res = new symElement(2**options.n).fill(0))=>{
    for (var i=0, li=a.length; i<li; ++i) res[i] = options.grades[i] & 1 ? coefficient.neg(a[i]) : a[i];
    return res;
  }

  // custom Involute, reverse all grades listed in grades
  /** @type {function(array, number, array=): array} */
  var gradeInvolute = (a, grade, res = new symElement(2**options.n).fill(0))=>{
    for (var i=0, li=a.length; i<li; ++i) res[i] = grade == options.grades[i] ? coefficient.neg(a[i]) : a[i];
    return res;
  }

  // Conjugation 0 1 1 0
  /** @type {function(array, array=): array} */
  var conjugate = (a, res = new symElement(2**options.n).fill(0))=>{
    for (var i=0, li=a.length; i<li; ++i) res[i] = options.grades[i] % 4 % 3 ? coefficient.neg(a[i]) : a[i];
    return res;
  }
  
  // Addition
  /** @type {function(array, array, array=): array} */
  var add = (a,b,res = new symElement(2**options.n).fill(0))=>{
    for (var i=0, li=a.length; i<li; ++i) res[i] = coefficient.add(a[i]??0, b[i]??0);
    return res;
  }
  
  // Subtraction
  /** @type {function(array, array, array=): array} */
  var sub = (a,b,res = new symElement(2**options.n).fill(0))=>{
    for (var i=0, li=a.length; i<li; ++i) res[i] = coefficient.add(a[i]??0, coefficient.neg(b[i]??0));
    return res;
  }

  // invert (scalar + study only)
  /** @type {function(array, array=): array} */
  var inv = (a, res = new symElement(2**options.n).fill(0))=>{
    const n = res.length-1;
    if (options.n < 4 || a[n] == 0) {
      res[0] = coefficient.inv(a[0]);
    } else {
      // Handle the 4D Algebras. Here the study number grade 4 part is a
      // single scalar coefficient and its square determines the result.
      if (options.Cayley[n][n][0] == 0) {
        res[0] = coefficient.inv(a[0]);
        res[n] = coefficient.neg( coefficient.mul(a[n],coefficient.mul(res[0],res[0])) );
      //@ts-ignore  
      } else return undefined; 
    }  
    return res;
  }
  
  // abs (scalar)
  /** @type {function(array, array=): array} */
  var abs = (a, res = new symElement(2**options.n).fill(0))=>{
    res[0] = 'Math.abs('+coefficient.format(a[0])+')';
    return res;
  }
  
  // sqrt (scalar + study only)
  /** @type {function(array, array=): array} */
  var sqrt = (a, res = new symElement(2**options.n).fill(0))=>{
    const n = res.length-1;
    if (a[n] == 0) {
      res[0] = '('+coefficient.format(a[0])+')**.5';
    } else {
      if (options.Cayley[n][n][0] == 0) { // its easier in PGA
        res[0] = '('+coefficient.format(a[0])+')**.5';
        res[n] = coefficient.mul(0.5,coefficient.mul(a[n],coefficient.inv(res[0]))); 
      } else { // Handle general case
        var nSS = coefficient.add(coefficient.mul(a[0],a[0]),coefficient.mul(coefficient.mul(a[n],a[n]),-1*options.Cayley[n][n][0])) ;   // squared norm of S*S.studyConjugate
        res[0]  = '('+coefficient.format(coefficient.mul(0.5,coefficient.add(a[0],'('+coefficient.format(nSS)+')**0.5')))+')**0.5';   // a = sqrt( (s.s + nss)/2 )
        res[n]  = coefficient.mul(a[n],coefficient.inv(coefficient.mul(2,res[0])));  // a[n]/2a
        return res;
      }  
    }
    return res;
  }

  // Grade selection
  /** @type {function(array, number): array} */
  var grade   = (a,g)=>a.map((x,i)=>options.grades[i]==g?x:0);

  /** @type {function(array): number} */
  var gradeOf = a=>a.reduce((s,x,i)=>x?options.grades[i]:s,0); 


  return {gp, ip, lp, rip, op, dual, undual, reverse, involute, gradeInvolute, conjugate, add, sub, inv, abs, sqrt, grade, gradeOf, create, type};
}