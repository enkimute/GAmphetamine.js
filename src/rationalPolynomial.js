//@ts-check
///////////////////////////////////////////////////////////////////////////////////////////
//
// A Rational Polynomial maintains two polynomials for nominator and denominator.
// These are used as the coefficients for a symbolic geometric algebra module. 
//
// A rationalPolynomial element is an array of two polynomials [nominator, denominator]
// A polynomial element is an array of terms of factors.
//
// e.g. 
//  (3x^2 + 2y) / (2x^3 + 2)
//  ==> [[[3,x,x],[2,y]],[[2,x,x,x],[3]]]
//
///////////////////////////////////////////////////////////////////////////////////////////

import polynomial from './polynomial.js';

var rationalPolynomial = function(coeff) {
  return (coeff === 0)            ? 0:                     // keep zero scalar
         (coeff === 0n)           ? 0n:                    // keep 0n bigint
         (coeff instanceof Array) ? coeff:                 // Already rationalPolynomial
         [polynomial(coeff), polynomial(typeof coeff=='bigint'?1n:1)]  // [poly, poly]
}

// Add two rational polynomials. 
// general formula (a/b) + (c/d) = (a*d + b*c) / (b*d)
// exception for same denominator (a/b) + (c/b) = (a+c)/b
  
rationalPolynomial.add = (a,b)=>{
  // Convert potential number, bigint and string inputs to rationalPolynomial format.
  a = rationalPolynomial(a); b = rationalPolynomial(b);
  // If either one is zero, return the other.
  if (a===0) return b; if (b===0) return a;
  if (a===0n) return b; if (b===0n) return a;
  // split nominator denominator.
  var [na,da] = a, [nb,db] = b;
  // Handle same denominator
  if (da.length === db.length && da+''== db) {
    var nn = polynomial.add(na,nb);
    if (nn===0 || nn[0][0]===0) return 0;
    if (nn===0n || nn[0][0]===0n) return 0n;
    if (nn.length == da.length && nn+'' == da) return 1;
    return [nn,da];
  }  
  // General addition formula
  var [nn, nd] = [polynomial.add(polynomial.mul(na,db),polynomial.mul(nb,da)),polynomial.mul(da,db)];
  // Return zero if the nominator is zero.
  if (nn===0 || nn[0][0]===0) return 0;
  if (nn===0n || nn[0][0]===0n) return 0n;
  // Return 1 if the nominator is equal to the denominator.
  if (nn+'' == nd) return 1;
  return [nn,nd]
}

// Multiply two rational polynomials. (a/b) * (c/d) = (a*b)/(c*d)
// Only minimal simplification afterwards is supported. TBC
  
rationalPolynomial.mul = (a,b)=>{
  // Convert number, bigint, string inputs to rationalPolynomial format.
  a = rationalPolynomial(a); b = rationalPolynomial(b);
  // If either is zero, return zero.
  if (a===0 || b===0) return 0;
  if (a===0n|| b===0n) return 0n;
  // If either is one, return the other
  if (a===1 || a===1n) return b;
  if (b===1 || b===1n) return a;
  // split and perform the multiplication
  var [na,da] = a, [nb,db] = b;
  var [nn,nd] = [polynomial.mul(na,nb),polynomial.mul(da,db)];
  // If the nominator ends up zero, return zero.
  if (nn===0 || nn[0][0]===0) return 0;
  // If nominator is denominator, return 1
  if (nn.length === nd.length && nn+''==nd) return 1;
  // remove common factors from simple expressions (limited)
  if (nn.length === 1 && nd.length === 1) {
    var [fl1,fl2] = [nn[0],nd[0]];
    var nnn = [fl1[0]], nnd = [fl2[0]];
    var p1=1, p2=1;
    while (true) {
      var [f1,f2] = [fl1[p1],fl2[p2]];
      if (f1 === undefined && f2 === undefined) break;
      if (f1 === f2) { p1++; p2++; continue; }
      if (f1 < f2 || f2 === undefined) { nnn.push(f1); p1++; }
                                  else { nnd.push(f2); p2++; }      
    }
    return [[nnn], [nnd]];                            
  }
  return [nn,nd];
}

// Invert a rational polynomial. 1/(a/b) = (b/a) 
  
rationalPolynomial.inv = (a)=>{
  a = rationalPolynomial(a);
  if (a===0 || a===0n) return 0;
  return [a[1],a[0]];
}
  
// Negate a rational polynmial. -(a/b) = (-a/b)
  
rationalPolynomial.neg = (a)=>{
  a = rationalPolynomial(a);
  if (a===0 || a===0n) return 0;
  return [polynomial.neg(a[0]),a[1]];
}

// Format a rational polynomial.
  
rationalPolynomial.format = (a, cse=true)=>{
  if (a===0) return 0;
  if (!(a instanceof Array)) return a;
  //if (a[0] instanceof Array && a[1] == 1 && cse) a = rationalPolynomial.cse([JSON.parse(JSON.stringify(a))],a[0].flat(2).filter(x=>typeof x == 'string'))[1][0];
  var [N,D] = a;
  if (D===undefined || D+''=='1,1') return polynomial.format(N);
  var fn = polynomial.format(N);
  if (fn == '0') return 0;
  if (fn === '') fn = '1';
  var dn = polynomial.format(D);
  if (fn==dn) return 1;
  if (fn=='0') return 0;
  if (dn=='1' || dn=='') return fn;
  return '('+fn+')/('+dn+')';
}
  
// Perform CSE on a collection of rationalPolynomial expressions.    
rationalPolynomial.cse = (expr, protect, isolate)=>{
  // First we collect and remember all unique denominators
  expr         = expr.map(x=>rationalPolynomial(x));
  var ex2      = expr.map(x=>x&&x[0]);
  var d        = expr.map(x=>x&&[x[1],x[1]+'']);
  var unique_d = Object.values(Object.fromEntries(d.map(x=>[x[0]+'',x[0]]))).filter(x=>x).map((x,i)=>['D'+(i+1),x,x+'']);
  // Now we perform block CSE on all unique expressions
  var tot      = [...ex2, ...unique_d.map(x=>x[1])];
  var res      = polynomial.cse (tot, protect, isolate);
  // We split the expressions and denominators back out.
  var r1       = res[1].slice(0,expr.length);
  var r2       = res[1].slice(expr.length);
  // Now we do the full replace.
  if (r2[0] && r2[0] != 1) {
    // Substitute the denominators and expressions. 
    // @ts-ignore 
    var r  = r1.map((x,i)=>[x,[[1,unique_d.find((x)=>x[2]==d[i][1]+'')[0]]]]);
    // Add all unique denominators to the precalc
    unique_d.forEach(D=>res[0].push('\n        '+D[0]+'='+polynomial.format(D[1])))  
  } else var r = r1.map((x,i)=>[x,1]); 
  return [res[0], r];
}

export default rationalPolynomial;