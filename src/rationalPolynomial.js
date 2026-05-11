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

var onePoly = [[1]];
var gcd = (a,b) => { while (b) [a,b] = [b, a%b]; return a; };
var isOnePoly = p => Array.isArray(p) && p.length === 1 && p[0].length === 1 && p[0][0] === 1;
var constPoly = p => Array.isArray(p) && p.length === 1 && p[0].length === 1 ? p[0][0] : undefined;
var sqrtConst = c => {
  if (typeof c !== 'number' || c < 0 || !Number.isFinite(c)) return undefined;
  var r = Math.sqrt(c);
  return Number.isInteger(r) ? r : undefined;
};
var samePoly = (a,b) => a === b || (Array.isArray(a) && Array.isArray(b) && a.length === b.length && a+'' === b+'');
var sqrtRoots = new Map();
var sqrtAtom = (poly) => {
  var atom = '(' + polynomial.format(poly) + ')**.5';
  sqrtRoots.set(atom, poly);
  return atom;
};
var hasSqrtPair = (poly) => Array.isArray(poly) && poly.some(term => {
  if (term.length > 12) return false;
  for (var i = 1; i < term.length - 1; i++) if (term[i] === term[i + 1] && sqrtRoots.has(term[i])) return true;
  return false;
});
var reduceSqrtPairs = (poly, depth = 0) => {
  if (!Array.isArray(poly)) return poly;
  if (depth > 4) return poly;
  var res = 0, changed = false;
  for (var term of poly) {
    var out = [term[0]], termChanged = false;
    for (var i = 1; i < term.length; i++) {
      var root = sqrtRoots.get(term[i]);
      if (root && term[i + 1] === term[i]) {
        if (term.length > 12 || root.length > 8) return poly;
        changed = termChanged = true;
        var rest = [out[0], ...out.slice(1), ...term.slice(i + 2)];
        res = polynomial.add(res, polynomial.mul([rest], root));
        i++;
        continue;
      }
      out.push(term[i]);
    }
    if (!termChanged && (out.length !== 1 || out[0] !== 0)) res = polynomial.add(res, [out]);
  }
  return changed ? reduceSqrtPairs(res, depth + 1) : poly;
};
var normalizePolyScalar = (p) => {
  if (!Array.isArray(p)) return p;
  var g = 0;
  for (var t of p) {
    var c = Math.abs(t[0]);
    if (!Number.isInteger(c)) { g = 1; break; }
    g = g ? gcd(g, c) : c;
  }
  if (g > 1) p = p.map(t => [t[0]/g, ...t.slice(1)]);
  return p[0][0] < 0 ? polynomial.neg(p) : p;
};
var scalePoly = (p, s) => p === 0 ? 0 : p.map(t => [t[0]*s, ...t.slice(1)]);
var intersectSorted = (a,b) => {
  var r = [], i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { r.push(a[i]); i++; j++; }
    else if (a[i] < b[j]) i++;
    else j++;
  }
  return r;
};
var divideMonomial = (poly, factors) => {
  if (!factors.length || !Array.isArray(poly)) return poly;
  return poly.map(term => {
    var out = [term[0]], fi = 0;
    for (var i = 1; i < term.length; i++) {
      if (fi < factors.length && term[i] === factors[fi]) fi++;
      else out.push(term[i]);
    }
    return out;
  });
};
var commonFactors = (poly) => {
  if (!Array.isArray(poly)) return [];
  if (poly.length === 1) return poly[0].slice(1).filter(f=>typeof f === 'string');
  return polynomial.monomialGCD(poly).factors;
};
var simplifyRational = (N,D) => {
  if (N === 0 || N === 0n) return 0;
  if (!Array.isArray(N) || !Array.isArray(D)) return [N,D];
  if (samePoly(N, D)) return 1;
  var ng = commonFactors(N), dg = commonFactors(D);
  var common = intersectSorted(ng, dg);
  if (common.length) {
    N = divideMonomial(N, common);
    D = divideMonomial(D, common);
  }
  if (samePoly(N, D)) return 1;
  return isOnePoly(D) ? [N, onePoly] : [N,D];
};
var polyFromRational = (a) => {
  a = rationalPolynomial(a);
  if (a === 0 || a === 0n) return 0;
  if (!Array.isArray(a)) return polynomial(a);
  return isOnePoly(a[1]) ? a[0] : null;
};
var termQuotient = (t, m) => {
  var q = [t[0] / m[0]], i = 1, j = 1;
  if (!Number.isFinite(q[0]) || q[0] === 0) return null;
  while (true) {
    var tf = t[i], mf = m[j];
    if (mf === undefined) {
      while (tf !== undefined) { q.push(tf); tf = t[++i]; }
      return q;
    }
    if (tf === undefined || tf > mf) return null;
    if (tf === mf) { i++; j++; }
    else { q.push(tf); i++; }
  }
};
var findTerm = (poly, term) => {
  for (var i = 0; i < poly.length; i++)
    if (poly[i][0] === term[0] && polynomial.compare(poly[i], term) === 0) return i;
  return -1;
};
var applyConstraintRule = (poly, rule) => {
  if (!Array.isArray(poly)) return poly;
  for (var mt of rule.match) for (var pt of poly) {
    var factor = termQuotient(pt, mt);
    if (!factor) continue;
    var sub = polynomial.mul([factor], rule.match);
    if (!Array.isArray(sub) || sub.some(t => findTerm(poly, t) < 0)) continue;
    var add = rule.replace === 0 ? 0 : polynomial.mul([factor], rule.replace);
    var next = polynomial.add(polynomial.add(poly, polynomial.neg(sub)), add);
    if (!samePoly(next, poly)) return next;
  }
  return poly;
};
var reducePolynomialByRules = (poly, rules) => {
  if (!Array.isArray(poly) || !rules?.length) return poly;
  var cur = poly;
  for (var guard = 0; guard < 32; guard++) {
    var next = cur;
    for (var rule of rules) next = applyConstraintRule(next, rule);
    if (samePoly(next, cur)) return cur;
    cur = next;
  }
  return cur;
};

rationalPolynomial.constraintRules = (conditions) => (conditions || []).map(polyFromRational).filter(Boolean).flatMap(P => {
  P = normalizePolyScalar(P);
  if (!Array.isArray(P)) return [];
  var constant = P.find(t => t.length === 1), rest = P.filter(t => t.length !== 1);
  if (!rest.length) return [];
  var rules = [];
  if (constant) {
    var matchSum = rest[0][0] < 0 ? normalizePolyScalar(polynomial.neg(rest)) : normalizePolyScalar(rest);
    var replaceConst = rest[0][0] < 0 ? constant[0] : -constant[0];
    var chosen = rest[0], other = rest.slice(1);
    var replacement = scalePoly(polynomial.neg(polynomial.add([[constant[0]]], other)), 1/chosen[0]);
    rules.push({ match: [[1, ...chosen.slice(1)]], replace: replacement });
    for (var term of matchSum) {
      var complement = matchSum.filter(t => t !== term);
      if (complement.length > 1) rules.push({ match: complement, replace: polynomial.add([[replaceConst]], [[-term[0], ...term.slice(1)]]) });
    }
    rules.push({ match: matchSum, replace: [[replaceConst]] });
    return rules;
  }
  rules.push({ match: normalizePolyScalar(rest), replace: 0 });
  return rules;
}).filter(r => r && Array.isArray(r.match) && !isOnePoly(r.match));

rationalPolynomial.reduceByRules = (expr, rules) => {
  if (!rules?.length) return expr;
  var reduceOne = a => {
    a = rationalPolynomial(a);
    if (a === 0 || a === 0n || !Array.isArray(a)) return a;
    var N = reducePolynomialByRules(a[0], rules), D = reducePolynomialByRules(a[1], rules);
    if (N === 0 || N === 0n) return 0;
    if (samePoly(N, D)) return 1;
    return isOnePoly(D) ? [N, onePoly] : [N, D];
  };
  return Array.isArray(expr) ? expr.map(reduceOne) : reduceOne(expr);
};

rationalPolynomial.sqrt = (a) => {
  a = rationalPolynomial(a);
  if (a === 0 || a === 0n) return 0;
  if (a === 1 || a === 1n) return 1;
  if (!Array.isArray(a)) return sqrtAtom(polynomial(a));
  if (isOnePoly(a[0]) && isOnePoly(a[1])) return 1;
  var nRoot = sqrtConst(constPoly(a[0])), dRoot = sqrtConst(constPoly(a[1]));
  if (nRoot !== undefined && dRoot !== undefined) return dRoot === 1 ? nRoot : [polynomial(nRoot), polynomial(dRoot)];
  if (isOnePoly(a[1])) return [[ [1, sqrtAtom(a[0])] ], onePoly];
  return '('+rationalPolynomial.format(a)+')**.5';
};

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
    return simplifyRational(nn, da);
  }  
  // General addition formula
  var [nn, nd] = [polynomial.add(polynomial.mul(na,db),polynomial.mul(nb,da)),polynomial.mul(da,db)];
  // Return zero if the nominator is zero.
  if (nn===0 || nn[0][0]===0) return 0;
  if (nn===0n || nn[0][0]===0n) return 0n;
  // Return 1 if the nominator is equal to the denominator.
  if (nn+'' == nd) return 1;
  return simplifyRational(nn, nd);
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
  var [nn,nd] = [polynomial.mul(na,nb), polynomial.mul(da,db)];
  if (hasSqrtPair(nn)) nn = reduceSqrtPairs(nn);
  if (hasSqrtPair(nd)) nd = reduceSqrtPairs(nd);
  // If the nominator ends up zero, return zero.
  if (nn===0 || nn[0][0]===0) return 0;
  // If nominator is denominator, return 1
  if (nn.length === nd.length && nn+''==nd) return 1;
  var simplified = simplifyRational(nn, nd);
  if (simplified !== 1 && (!Array.isArray(simplified) || simplified[0] !== nn || simplified[1] !== nd)) return simplified;
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
  return simplifyRational(nn, nd);
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
var cancelRationalFactors = (expr) => {
  for (var i = 0; i < expr.length; i++) {
    if (!Array.isArray(expr[i])) continue;
    var N = expr[i][0], D = expr[i][1];
    if (!Array.isArray(N) || !Array.isArray(D) || D.length < 2) continue;
    var det = polynomial.detectPower(D);
    var Q = det ? det.Q : D, nMax = det ? det.n : 1;
    var k = 0, curN = N;
    while (k < nMax) {
      var divided = polynomial.divide(curN, Q);
      if (!divided) break;
      curN = divided;
      k++;
    }
    if (k > 0) expr[i] = [curN, nMax - k > 0 ? polynomial.power(Q, nMax - k) : [[1]]];
  }
  return expr;
};

var rationalCSE = (expr, protect, isolate, polyCSE)=>{
  // First we collect and remember all unique denominators
  expr         = expr.map(x=>rationalPolynomial(x));
  cancelRationalFactors(expr);
  var ex2      = expr.map(x=>x&&x[0]);
  var d        = expr.map(x=>x&&[x[1],x[1]+'']);
  var degree   = x => Array.isArray(x) ? x.reduce((m,t)=>Math.max(m, t.length - 1), 0) : 0;
  var unique_d = Object.values(Object.fromEntries(d.map(x=>[x[0]+'',x[0]])))
                       .filter(x=>x&&x+''!='1')
                       .sort((a,b)=>degree(a)-degree(b) || (a+'' < b+'' ? -1 : a+'' > b+'' ? 1 : 0))
                       .map((x,i)=>['D'+(i+1),x,x+'']);
  var atomicSubs = new Map();
  unique_d.forEach(D => {
    if (D[1].length === 1 && D[1][0].length === 2 && typeof D[1][0][1] === 'string' && D[1][0][0] === 1)
      atomicSubs.set(D[1][0][1], D[0]);
  });
  if (atomicSubs.size) {
    var substituteFactor = (poly) => {
      if (!Array.isArray(poly)) return poly;
      return poly.map(term => Array.isArray(term)
        ? term.map((f, i) => i === 0 ? f : (typeof f === 'string' && atomicSubs.has(f) ? atomicSubs.get(f) : f))
        : term);
    };
    ex2 = ex2.map(substituteFactor);
    var keyMap = new Map();
    unique_d.forEach(D => {
      var oldKey = D[2];
      var isAtomic = D[1].length === 1 && D[1][0].length === 2 && atomicSubs.get(D[1][0][1]) === D[0];
      if (!isAtomic) { D[1] = substituteFactor(D[1]); D[2] = D[1] + ''; }
      keyMap.set(oldKey, D[2]);
    });
    d.forEach(x => { if (x && keyMap.has(x[1] + '')) x[1] = keyMap.get(x[1] + ''); });
  }
  // Perform CSE on numerators only (denominators must not be transformed by isolation).
  var res      = polyCSE(ex2, protect, isolate);
  var r1       = res[1];
  // Now we do the full replace.
  if (unique_d.length) {
    // Substitute the denominators and expressions.
    // @ts-ignore
    var r  = r1.map((x,i)=>{
      var ud = unique_d.find((x)=>x[2]==d[i][1]+'');
      return ud ? [x,[[1,ud[0]]]] : [x,1];
    });
    // Add all unique denominators to the precalc. If a denominator is a perfect power
    // of an already-emitted polynomial (or of a freshly-extracted helper), emit it as
    // a product instead of expanding the multinomial. e.g. PGA bivector inverse: D2=D1*D1*D1.
    // Also reuse atomic shared-product helpers from the numerator prelude (e.g. a0a0=a0*a0)
    // so D1=a0*a0+a1*a1+a2*a2 becomes D1=a0a0+a1a1+a2a2.
    var emitted = [], rules = polynomial.atomicProductRules(res[0]), atomicHead = [];
    unique_d.forEach(D=>{
      var isAtomic = D[1].length === 1 && D[1][0].length === 2 && atomicSubs.get(D[1][0][1]) === D[0];
      if (isAtomic) {
        atomicHead.push('\n        '+D[0]+'='+D[1][0][1]);
        emitted.push({ name: D[0], poly: D[1] });
        return;
      }
      var det = polynomial.detectPower(D[1]), rhs;
      if (det) {
        var qName = null;
        for (var p of emitted) if (p.poly.length === det.Q.length && polynomial.add(det.Q, polynomial.neg(p.poly)) === 0) { qName = p.name; break; }
        if (!qName) {
          qName = D[0] + 'q';
          res[0].push('\n        '+qName+'='+polynomial.applyAtomicProducts(polynomial.format(det.Q), rules));
          emitted.push({ name: qName, poly: det.Q });
        }
        rhs = Array(det.n).fill(qName).join('*');
      } else rhs = polynomial.applyAtomicProducts(polynomial.format(D[1]), rules);
      res[0].push('\n        '+D[0]+'='+rhs);
      emitted.push({ name: D[0], poly: D[1] });
    });
    if (atomicHead.length) res[0].unshift(...atomicHead);
  } else var r = r1.map((x,i)=>[x,1]);
  return [res[0], r];
}

rationalPolynomial.cse = (expr, protect, isolate)=>rationalCSE(expr, protect, isolate, polynomial.cse);

// Late string-level cleanup after rational formatting has exposed
// denominator helpers and factored numerators. Verified against atomic square
// definitions in the prelude before rewriting.
rationalPolynomial.postprocessCSE = (prelude, expr) => {
  var defs = new Map();
  prelude.forEach(entry => {
    var s = ('' + entry).trim();
    var m = /^([_A-Za-z]\w*)=(.+)$/.exec(s);
    if (m) defs.set(m[1], m[2]);
  });
  var atom = '[_A-Za-z]\\w*(?:\\[\\d+\\])?';
  var squareRoot = (name) => {
    var body = defs.get(name);
    var m = body && new RegExp('^(' + atom + ')\\*\\1$').exec(body);
    return m && m[1];
  };
  var helper = new Map(), helpers = [];
  var getHelper = (a, b) => {
    var key = a < b ? a + '|' + b : b + '|' + a;
    var name = helper.get(key);
    if (!name) {
      name = '_q' + helper.size;
      helper.set(key, name);
      helpers.push(name + '=' + (a < b ? a + '+' + b : b + '+' + a));
    }
    return name;
  };
  var re = new RegExp('(' + atom + ')\\*\\(([_A-Za-z]\\w*)-([_A-Za-z]\\w*)-2\\*([_A-Za-z]\\w*)\\*([_A-Za-z]\\w*)-([_A-Za-z]\\w*)\\)', 'g');
  expr = expr.map(str => ('' + str).replace(re,
    (match, outer, pos, negA, crossA, crossB, negB) => {
      if (squareRoot(negA) !== crossA || squareRoot(negB) !== crossB) return match;
      var q = getHelper(crossA, crossB);
      return outer + '*(' + pos + '-' + q + '*' + q + ')';
    }));
  if (helpers.length) prelude.push(...helpers);

  var productName = new Map();
  var productKey = (a, b) => a < b ? a + '*' + b : b + '*' + a;
  defs.forEach((body, name) => {
    var m = new RegExp('^(' + atom + ')\\*(' + atom + ')$').exec(body);
    if (m) productName.set(productKey(m[1], m[2]), name);
  });
  var squareSumName = new Map();
  defs.forEach((body, name) => {
    if (!/^[^+\-]+(?:\+[^+\-]+)+$/.test(body)) return;
    var terms = body.split('+');
    if (terms.every(t => squareRoot(t))) squareSumName.set(terms.slice().sort().join('+'), name);
  });
  var signedTerms = body => {
    if (!body || /[*/()]/.test(body)) return null;
    var parts = body.match(/[+-]?[^+-]+/g) || [];
    return parts.map((p, i) => {
      var sign = p[0] === '-' ? -1 : 1;
      var term = (p[0] === '-' || p[0] === '+') ? p.slice(1) : p;
      return term && (i || p[0] !== '+') ? { sign, term } : null;
    }).filter(Boolean);
  };
  var canonicalSum = body => {
    var terms = signedTerms(body);
    if (!terms || terms.length < 2 || terms.some(t => /[*/()]/.test(t.term))) return null;
    terms.sort((a, b) => a.term.localeCompare(b.term) || a.sign - b.sign);
    return terms.map(t => (t.sign < 0 ? '-' : '+') + t.term).join('');
  };
  var completedDotSums = new Set();
  var signedSquareTerms = body => {
    if (!body || /[()]/.test(body)) return null;
    var parts = body.match(/[+-]?[^+-]+/g) || [];
    return parts.map((p, i) => {
      var sign = p[0] === '-' ? -1 : 1;
      var term = (p[0] === '-' || p[0] === '+') ? p.slice(1) : p;
      return term && (i || p[0] !== '+') ? { sign, term } : null;
    }).filter(Boolean);
  };
  var completeDotMatch = (match, root, sum, outer, squares, rootSign = 1, outerSign = 1) => {
    var st = signedSquareTerms(squares);
    if (!st || st.length < 3) return match;
    st = st.map(x => {
      var m = new RegExp('^(\\d+)\\*(' + atom + ')$').exec(x.term);
      var coeff = m ? +m[1] : 1, term = m ? m[2] : x.term, sqRoot = squareRoot(term);
      return { ...x, coeff, term, root: sqRoot };
    });
    if (!st.every(x => x.root)) return match;
    var D = squareSumName.get(st.map(x => x.term).sort().join('+'));
    var prod = productName.get(productKey(root, outer));
    if (!D || !prod) return match;
    var rootSq = st.find(x => x.root === root);
    if (!rootSq) return match;
    var oldShape = rootSq.coeff === 1 && st.every(x => x.coeff === 1 && (x === rootSq || x.sign === -rootSq.sign));
    var tripleShape = rootSq.coeff === 3 && st.every(x => x.coeff === (x === rootSq ? 3 : 1) && x.sign === rootSq.sign);
    if (!oldShape && !tripleShape) return match;
    var terms = signedTerms(sum);
    if (!terms || !terms.every(t => /^[_A-Za-z]\w*$/.test(t.term)) || terms.some(t => t.term === prod)) return match;
    var prodTerm = (rootSq.sign > 0 ? '+' : '-') + prod;
    var dSign = oldShape ? -rootSq.sign : rootSq.sign;
    var signed = (sign, body, first = false) => sign < 0 ? '-' + body : (first ? body : '+' + body);
    var rootBody = '2*' + root + '*(' + sum + prodTerm + ')';
    var dBody = outer + '*' + D;
    completedDotSums.add(canonicalSum(sum + prodTerm));
    return signed(rootSign, rootBody, true) + signed(outerSign * dSign, dBody);
  };
  var completeDotA = new RegExp('2\\*(' + atom + ')\\*\\(([^()]+)\\)\\+(' + atom + ')\\*\\(([^()]+)\\)', 'g');
  var completeDotB = new RegExp('(' + atom + ')\\*\\(([^()]+)\\)\\+2\\*(' + atom + ')\\*\\(([^()]+)\\)', 'g');
  var completeDotNegA = new RegExp('-2\\*(' + atom + ')\\*\\(([^()]+)\\)-(' + atom + ')\\*\\(([^()]+)\\)', 'g');
  var completeDotNegB = new RegExp('-(' + atom + ')\\*\\(([^()]+)\\)-2\\*(' + atom + ')\\*\\(([^()]+)\\)', 'g');
  expr = expr.map(str => ('' + str)
    .replace(completeDotA, (match, root, sum, outer, squares) => completeDotMatch(match, root, sum, outer, squares))
    .replace(completeDotB, (match, outer, squares, root, sum) => completeDotMatch(match, root, sum, outer, squares))
    .replace(completeDotNegA, (match, root, sum, outer, squares) => completeDotMatch(match, root, sum, outer, squares, -1, -1))
    .replace(completeDotNegB, (match, outer, squares, root, sum) => completeDotMatch(match, root, sum, outer, squares, -1, -1)));

  for (var D of squareSumName.values()) {
    var escD = D.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var negDiv = new RegExp('\\(-(' + atom + ')\\)/\\(' + escD + '\\)', 'g');
    var negMul = new RegExp('-(' + atom + ')\\*' + escD + '(?![_A-Za-z0-9\\[])', 'g');
    var posDiv = new RegExp('(?<![-_A-Za-z0-9\\]])\\((' + atom + ')\\)/\\(' + escD + '\\)', 'g');
    var posMul = new RegExp('(?<![-_A-Za-z0-9\\]])\\+(' + atom + ')\\*' + escD + '(?![_A-Za-z0-9\\[])', 'g');
    var divs = 0, muls = 0, pos = 0, safe = true;
    expr.forEach(e => {
      var s = '' + e;
      s = s.replace(negDiv, () => { divs++; return ''; });
      s = s.replace(negMul, () => { muls++; return ''; });
      s = s.replace(posDiv, () => { pos++; return ''; });
      s = s.replace(posMul, () => { pos++; return ''; });
      if (new RegExp('(?<![_A-Za-z0-9\\]])' + escD + '(?![_A-Za-z0-9\\[])').test(s)) safe = false;
    });
    if (!safe || divs + muls <= pos) continue;
    var body = defs.get(D);
    if (!body || body[0] === '-') continue;
    prelude = prelude.map(entry => /^([_A-Za-z]\w*)=/.exec(('' + entry).trim())?.[1] === D ? ('' + entry).replace('=' + body, '=-' + body.replace(/\+/g, '-')) : entry);
    expr = expr.map(e => {
      var held = [];
      return ('' + e).replace(posDiv, (_, x) => {
                    var id = held.push('(-' + x + ')/(' + D + ')') - 1;
                    return '__HELD' + id + '__';
                  })
                  .replace(posMul, (_, x) => {
                    var id = held.push('-' + x + '*' + D) - 1;
                    return '__HELD' + id + '__';
                  })
                  .replace(negDiv, '($1)/(' + D + ')')
                  .replace(negMul, '+$1*' + D)
                  .replace(/__HELD(\d+)__/g, (_, i) => held[i]);
    });
  }

  var signFlipDenominator = (D) => {
    var def = defs.get(D);
    if (!def || def[0] === '-') return false;
    var escD = D.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var negDiv = new RegExp('\\(-(' + atom + '|1)\\)/\\(' + escD + '\\)', 'g');
    var posDiv = new RegExp('(?<![-_A-Za-z0-9\\]])\\((' + atom + '|1)\\)/\\(' + escD + '\\)', 'g');
    var neg = 0, pos = 0, safe = true;
    expr.forEach(e => {
      var s = '' + e;
      s = s.replace(negDiv, () => { neg++; return ''; });
      s = s.replace(posDiv, () => { pos++; return ''; });
      if (new RegExp('(?<![_A-Za-z0-9\\]])' + escD + '(?![_A-Za-z0-9\\[])').test(s)) safe = false;
    });
    if (!safe || neg <= pos + 1) return false;
    var negDef = /^[^()/-]+(?:\+[^()/-]+)+$/.test(def) ? '-' + def.replace(/\+/g, '-') : '-' + def;
    prelude = prelude.map(entry => /^([_A-Za-z]\w*)=/.exec(('' + entry).trim())?.[1] === D ? ('' + entry).replace('=' + def, '=' + negDef) : entry);
    expr = expr.map(e => {
      var held = [];
      return ('' + e).replace(posDiv, (_, x) => {
                    var id = held.push('(-' + x + ')/(' + D + ')') - 1;
                    return '__HELD' + id + '__';
                  })
                  .replace(negDiv, '($1)/(' + D + ')')
                  .replace(/__HELD(\d+)__/g, (_, i) => held[i]);
    });
    defs.set(D, negDef);
    return true;
  };
  defs.forEach((body, name) => {
    if (/^[_A-Za-z]\w*(?:\[\d+\])?$/.test(body)) signFlipDenominator(name);
  });
  defs.forEach((body, name) => {
    if (!/[+]/.test(body) || /[-/()]/.test(body)) return;
    signFlipDenominator(name);
  });
  defs.forEach((body, name) => {
    var m = /^([_A-Za-z]\w*)\*\1$/.exec(body);
    if (!m || !defs.has(m[1]) || defs.get(name)?.[0] === '-') return;
    var escD = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var negDiv = new RegExp('\\(-(' + atom + '|1)\\)/\\(' + escD + '\\)', 'g');
    var posDiv = new RegExp('(?<![-_A-Za-z0-9\\]])\\((' + atom + '|1)\\)/\\(' + escD + '\\)', 'g');
    var neg = 0, pos = 0, safe = true;
    expr.forEach(e => {
      var s = ('' + e).replace(negDiv, () => { neg++; return ''; })
                       .replace(posDiv, () => { pos++; return ''; });
      if (new RegExp('(?<![_A-Za-z0-9\\]])' + escD + '(?![_A-Za-z0-9\\[])').test(s)) safe = false;
    });
    if (!safe || neg <= pos + 1) return;
    prelude = prelude.map(entry => /^([_A-Za-z]\w*)=/.exec(('' + entry).trim())?.[1] === name ? ('' + entry).replace('=' + body, '=-' + body) : entry);
    expr = expr.map(e => {
      var held = [];
      return ('' + e).replace(posDiv, (_, x) => {
                    var id = held.push('(-' + x + ')/(' + name + ')') - 1;
                    return '__HELD' + id + '__';
                  })
                  .replace(negDiv, '($1)/(' + name + ')')
                  .replace(/__HELD(\d+)__/g, (_, i) => held[i]);
    });
    defs.set(name, '-' + body);
  });

  var lateStart = prelude.length;
  var usedNames = new Set();
  prelude.forEach(entry => {
    var m = /^([_A-Za-z]\w*)=/.exec(('' + entry).trim());
    if (m) usedNames.add(m[1]);
  });
  var nextName = () => {
    var i = 0, name;
    do name = '_r' + i++; while (usedNames.has(name));
    usedNames.add(name);
    return name;
  };
  var rootCounts = new Map();
  expr.forEach(e => {
    for (var m of (('' + e).match(/\([^()]+\)\*\*(?:\.5|0\.5)/g) || []))
      rootCounts.set(m, (rootCounts.get(m) || 0) + 1);
  });
  for (var [root, count] of rootCounts) {
    if (count < 2) continue;
    var name = nextName();
    prelude.push(name + '=' + root);
    var esc = root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var rex = new RegExp(esc, 'g');
    expr = expr.map(e => ('' + e).replace(rex, name));
  }
  var squareSumHelpers = new Map(squareSumName);
  var lateDefs = new Map();
  var getSquareSumHelper = terms => {
    var key = terms.slice().sort().join('+'), name = squareSumHelpers.get(key);
    if (!name) {
      name = nextName();
      squareSumHelpers.set(key, name);
      lateDefs.set(name, terms.join('+'));
      prelude.push(name + '=' + terms.join('+'));
    }
    return name;
  };
  var equivalentRewrite = (a, b) => {
    var expand = s => {
      for (var i = 0; i < 4; i++) {
        var next = ('' + s).replace(new RegExp('(?<![_A-Za-z0-9\\]])(' + atom + ')(?![_A-Za-z0-9\\[])', 'g'), (m, name) => {
          var body = lateDefs.get(name) || defs.get(name);
          return body ? '(' + body + ')' : m;
        });
        if (next === s) break;
        s = next;
      }
      return s;
    };
    a = expand(a); b = expand(b);
    var names = [...new Set((a + ' ' + b).match(new RegExp(atom, 'g')) || [])];
    for (var seed = 0; seed < 3; seed++) {
      var values = new Map(names.map((n, i) => [n, '' + (seed + i + 2)]));
      var subst = s => s.replace(new RegExp('(?<![_A-Za-z0-9\\]])(' + atom + ')(?![_A-Za-z0-9\\[])', 'g'), m => values.get(m) || m);
      var av, bv;
      try {
        av = Function('return (' + subst(a) + ')')();
        bv = Function('return (' + subst(b) + ')')();
      } catch {
        return false;
      }
      if (Math.abs(av - bv) > 1e-9) return false;
    }
    return true;
  };
  var completeSandwichMatch = (match, outer, squares, rootSign, root, sum) => {
    var st = signedSquareTerms(squares);
    if (!st || st.length < 2) return match;
    st = st.map(x => ({ ...x, root: squareRoot(x.term) }));
    if (!st.every(x => x.root)) return match;
    var rootSq = st.find(x => x.root === root);
    if (!rootSq || !st.every(x => x === rootSq || x.sign === -rootSq.sign)) return match;
    var prod = productName.get(productKey(root, outer));
    if (!prod) return match;
    var terms = signedTerms(sum);
    var atomOnly = new RegExp('^' + atom + '$');
    if (!terms || !terms.every(t => atomOnly.test(t.term)) || terms.some(t => t.term === prod)) return match;
    var D = getSquareSumHelper(st.map(x => x.term));
    var dBody = outer + '*' + D;
    for (var prodSign of [1, -1]) {
      var prodTerm = (prodSign > 0 ? '+' : '-') + prod;
      var rBody = '2*' + root + '*(' + sum + prodTerm + ')';
      for (var rewrite of [rBody + '-' + dBody, dBody + '-' + rBody]) {
        if (!equivalentRewrite(match, rewrite)) continue;
        completedDotSums.add(canonicalSum(sum + prodTerm));
        return rewrite;
      }
    }
    return match;
  };
  var swA = new RegExp('(' + atom + ')\\*\\(([^()]+)\\)\\+2\\*(' + atom + ')\\*\\(([^()]+)\\)', 'g');
  var swB = new RegExp('(' + atom + ')\\*\\(([^()]+)\\)-2\\*(' + atom + ')\\*\\(([^()]+)\\)', 'g');
  expr = expr.map(str => ('' + str)
    .replace(swA, (match, outer, squares, root, sum) => completeSandwichMatch(match, outer, squares, 1, root, sum))
    .replace(swB, (match, outer, squares, root, sum) => completeSandwichMatch(match, outer, squares, -1, root, sum)));

  var counts = new Map();
  expr.forEach(e => {
    for (var m of (('' + e).match(/\([^()]+\)/g) || [])) {
      var body = m.slice(1, -1);
      if (!/[+-]/.test(body) || /[/?]/.test(body)) continue;
      counts.set(m, (counts.get(m) || 0) + 1);
    }
  });
  for (var [substr, count] of counts) {
    if (count < 2) continue;
    var name = nextName(), body = substr.slice(1, -1);
    prelude.push(name + '=' + body);
    var esc = substr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var rex = new RegExp(esc, 'g');
    expr = expr.map(e => ('' + e).replace(rex, name));
  }

  var formatCanonicalSum = key => key.replace(/^\+/, '');
  for (var key of completedDotSums) {
    var variants = new Map();
    expr.forEach(e => {
      for (var m of (('' + e).match(/\([^()]+\)/g) || [])) {
        var body = m.slice(1, -1);
        if (canonicalSum(body) === key) variants.set(m, body);
      }
    });
    var count = 0;
    variants.forEach((body, substr) => {
      var esc = substr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      expr.forEach(e => count += (('' + e).match(new RegExp(esc, 'g')) || []).length);
    });
    if (count < 2 || variants.size < 2) continue;
    var body = formatCanonicalSum(key), name = null;
    for (var entry of prelude) {
      var m = /^([_A-Za-z]\w*)=(.+)$/.exec(('' + entry).trim());
      if (m && canonicalSum(m[2]) === key) { name = m[1]; break; }
    }
    if (!name) {
      name = nextName();
      prelude.push(name + '=' + body);
    }
    for (var substr of variants.keys()) {
      var esc = substr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var rex = new RegExp(esc, 'g');
      expr = expr.map(e => ('' + e).replace(rex, name));
    }
  }

  var splitTopTerms = rhs => {
    var terms = [], depth = 0, start = 0, sign = '+';
    if (rhs[0] === '-' || rhs[0] === '+') { sign = rhs[0]; start = 1; }
    for (var i = start; i < rhs.length; i++) {
      var c = rhs[i];
      if (c === '(' || c === '[') depth++;
      else if (c === ')' || c === ']') depth--;
      else if (depth === 0 && (c === '+' || c === '-')) {
        terms.push({ sign, body: rhs.slice(start, i) });
        sign = c; start = i + 1;
      }
    }
    if (start < rhs.length) terms.push({ sign, body: rhs.slice(start) });
    return terms;
  };
  var outputPairCounts = new Map();
  var parsedExpr = expr.map(e => splitTopTerms('' + e));
  parsedExpr.forEach((terms, ei) => {
    if (terms.length < 3) return;
    for (var i = 0; i < terms.length; i++) for (var j = i + 1; j < terms.length; j++) {
      var ti = terms[i], tj = terms[j];
      if (/[/?]/.test(ti.body) || /[/?]/.test(tj.body)) continue;
      var a = ti.body < tj.body ? ti : tj, b = ti.body < tj.body ? tj : ti;
      var flip = a.sign === '-' ? -1 : 1;
      var as = flip < 0 ? '+' : a.sign;
      var bs = flip < 0 ? (b.sign === '-' ? '+' : '-') : b.sign;
      var key = (as === '+' ? '' : '-') + a.body + bs + b.body;
      if (!outputPairCounts.has(key)) outputPairCounts.set(key, []);
      outputPairCounts.get(key).push({ ei, i, j, flip });
    }
  });
  var outputPairs = [...outputPairCounts].filter(([,occs]) => new Set(occs.map(o => o.ei)).size >= 2)
                                         .sort((a,b)=>b[1].length-a[1].length);
  var claimed = parsedExpr.map(() => new Set());
  for (var [key, occs] of outputPairs) {
    var valid = occs.filter(o => !claimed[o.ei].has(o.i) && !claimed[o.ei].has(o.j));
    if (new Set(valid.map(o => o.ei)).size < 2) continue;
    var name = nextName();
    prelude.push(name + '=' + key);
    for (var occ of valid) {
      claimed[occ.ei].add(occ.i); claimed[occ.ei].add(occ.j);
      parsedExpr[occ.ei][occ.i] = { sign: occ.flip > 0 ? '+' : '-', body: name, replaced: true };
      parsedExpr[occ.ei][occ.j] = null;
    }
  }
  expr = parsedExpr.map((terms, ei) => {
    if (!terms.some(t => t && t.replaced)) return expr[ei];
    var ts = terms.filter(Boolean), rhs = '';
    for (var i = 0; i < ts.length; i++) rhs += (i === 0 && ts[i].sign === '+') ? ts[i].body : ts[i].sign + ts[i].body;
    return rhs;
  });

  var isAtom = s => /^[_A-Za-z]\w*(?:\[\d+\])?$/.test(s);
  var productInsert = lateStart;
  var productNames = new Set();
  var entryName = entry => /^([_A-Za-z]\w*)=/.exec(('' + entry).trim())?.[1];
  var replaceWholeExprWithPrelude = () => {
    var byBody = new Map();
    prelude.forEach(entry => {
      var m = /^([_A-Za-z]\w*)=(.+)$/.exec(('' + entry).trim());
      if (m && !byBody.has(m[2])) byBody.set(m[2], m[1]);
    });
    expr = expr.map(e => byBody.get('' + e) || e);
  };
  replaceWholeExprWithPrelude();

  var factorCommonProducts = list => list.map(entry => {
    var m = /^([_A-Za-z]\w*)=(.+)$/.exec(('' + entry).trim());
    var lhs = m && m[1], rhs = m ? m[2] : '' + entry;
    if (!/[+-]/.test(rhs) || /[()/]/.test(rhs)) return entry;
    var terms = splitTopTerms(rhs);
    if (terms.length < 2) return entry;
    var splitFactors = t => t.body.split('*').filter(isAtom);
    var first = splitFactors(terms[0]);
    var factor = first.find(f => terms.every(t => splitFactors(t).includes(f)));
    if (!factor) return entry;
    var body = terms.map((t,i) => {
      var parts = t.body.split('*'), idx = parts.indexOf(factor);
      if (idx < 0) return null;
      parts.splice(idx, 1);
      var rest = parts.join('*') || '1';
      return (i === 0 && t.sign === '+' ? '' : t.sign) + rest;
    }).join('');
    var out = factor + '*(' + body + ')';
    return lhs ? lhs + '=' + out : out;
  });
  prelude = factorCommonProducts(prelude);
  expr = factorCommonProducts(expr);

  while (true) {
    var productCounts = new Map();
    var scan = [...prelude.filter(e => !productNames.has(entryName(e))), ...expr];
    var productChain = new RegExp(atom + '(?:\\*' + atom + ')+', 'g');
    scan.forEach(e => {
      for (var m of (('' + e).match(productChain) || [])) {
        var parts = m.split('*').filter(isAtom);
        for (var i = 0; i < parts.length - 1; i++) {
          var a = parts[i], b = parts[i + 1];
          var key = a < b ? a + '*' + b : b + '*' + a;
          productCounts.set(key, (productCounts.get(key) || 0) + 1);
        }
      }
    });
    var products = [...productCounts].filter(([,count]) => count >= 2)
                                    .sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0]));
    if (!products.length) break;
    for (var [prod] of products) {
      var name = nextName();
      var depIndex = -1;
      prod.split('*').forEach(op => {
        var idx = prelude.findIndex(e => entryName(e) === op);
        if (idx > depIndex) depIndex = idx;
      });
      var insertAt = depIndex + 1;
      prelude.splice(insertAt, 0, name + '=' + prod);
      productNames.add(name);
      if (insertAt <= productInsert) productInsert++;
      var esc = prod.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var rev = prod.split('*').reverse().join('*').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var rex = new RegExp('(?<![_A-Za-z0-9\\]])(?:' + esc + '|' + rev + ')(?![_A-Za-z0-9\\[])', 'g');
      for (var i = insertAt + 1; i < prelude.length; i++) prelude[i] = ('' + prelude[i]).replace(rex, name);
      expr = expr.map(e => ('' + e).replace(rex, name));
    }
  }

  var scaledProductNames = new Set();
  while (true) {
    var factorCounts = new Map();
    var scan = [...prelude.slice(productInsert).filter(e => !scaledProductNames.has(entryName(e))), ...expr];
    var scaledChain = new RegExp('(?<![_A-Za-z0-9\\]])-?2\\*(' + atom + '(?:\\*' + atom + ')+)(?![_A-Za-z0-9\\[])', 'g');
    scan.forEach(e => {
      for (var m of (('' + e).matchAll(scaledChain) || [])) {
        var parts = m[1].split('*').filter(isAtom);
        for (var p of new Set(parts)) factorCounts.set(p, (factorCounts.get(p) || 0) + 1);
      }
    });
    var factors = [...factorCounts].filter(([,count]) => count >= 2)
                                    .sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0]));
    if (!factors.length) break;
    for (var [factor] of factors) {
      var name = nextName();
      var depIndex = prelude.findIndex(e => entryName(e) === factor);
      var insertAt = Math.max(productInsert, depIndex + 1);
      prelude.splice(insertAt, 0, name + '=2*' + factor);
      scaledProductNames.add(name);
      if (insertAt === productInsert) productInsert++;
      var replaceScaled = text => ('' + text).replace(scaledChain, (match, chain) => {
        var sign = match[0] === '-' ? '-' : '';
        var parts = chain.split('*');
        var idx = parts.indexOf(factor);
        if (idx < 0) return match;
        parts.splice(idx, 1);
        return sign + (parts.length ? parts.join('*') + '*' : '') + name;
      });
      for (var i = insertAt + 1; i < prelude.length; i++) prelude[i] = replaceScaled(prelude[i]);
      expr = expr.map(replaceScaled);
    }
  }

  var scaleNames = new Set();
  while (true) {
    var scaleCounts = new Map();
    var scan = [...prelude.slice(productInsert).filter(e => !scaleNames.has(entryName(e))), ...expr];
    scan.forEach(e => {
      var text = '' + e;
      var rex = new RegExp('(?<![_A-Za-z0-9\\]])2\\*(' + atom + ')(?![_A-Za-z0-9\\[])', 'g');
      for (var m of text.matchAll(rex)) if (isAtom(m[1])) scaleCounts.set(m[1], (scaleCounts.get(m[1]) || 0) + 1);
    });
    var scales = [...scaleCounts].filter(([,count]) => count >= 2)
                                  .sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0]));
    if (!scales.length) break;
    for (var [term] of scales) {
      var name = nextName();
      var depIndex = prelude.findIndex(e => entryName(e) === term);
      var insertAt = Math.max(productInsert, depIndex + 1);
      prelude.splice(insertAt, 0, name + '=2*' + term);
      scaleNames.add(name);
      if (insertAt === productInsert) productInsert++;
      var esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var rex = new RegExp('(?<![_A-Za-z0-9\\]])2\\*' + esc + '(?![_A-Za-z0-9\\[])', 'g');
      for (var i = insertAt + 1; i < prelude.length; i++) prelude[i] = ('' + prelude[i]).replace(rex, name);
      expr = expr.map(e => ('' + e).replace(rex, name));
    }
  }

  var flipScaledHelperSigns = () => {
    var parseTerms = rhs => {
      var terms = [], depth = 0, start = 0, sign = '+';
      if (rhs[0] === '-' || rhs[0] === '+') { sign = rhs[0]; start = 1; }
      for (var i = start; i < rhs.length; i++) {
        var c = rhs[i];
        if (c === '(' || c === '[') depth++;
        else if (c === ')' || c === ']') depth--;
        else if (depth === 0 && (c === '+' || c === '-')) {
          terms.push({ sign, body: rhs.slice(start, i) });
          sign = c; start = i + 1;
        }
      }
      if (start < rhs.length) terms.push({ sign, body: rhs.slice(start) });
      return terms;
    };
    var joinTerms = terms => {
      terms = [...terms].sort((a, b) => (a.sign === '-' ? 1 : 0) - (b.sign === '-' ? 1 : 0));
      var rhs = '';
      for (var i = 0; i < terms.length; i++) rhs += (i === 0 && terms[i].sign === '+') ? terms[i].body : terms[i].sign + terms[i].body;
      return rhs;
    };
    var signs = xs => xs.reduce((s, x) => s + ((x + '').match(/[+-]/g) || []).length, 0);
    var candidates = prelude.map((entry, idx) => {
      var m = /^([_A-Za-z]\w*)=(.+)$/.exec(('' + entry).trim());
      var p = m && { name: m[1], body: m[2] };
      return p && /^2\*[_A-Za-z]\w*$/.test(p.body) ? { idx, ...p } : null;
    }).filter(Boolean);
    for (var c of candidates) {
      var esc = c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var hasName = new RegExp('(?<![_A-Za-z0-9\\]])' + esc + '(?![_A-Za-z0-9\\[])');
      var flipBody = body => {
        if (!hasName.test(body) || !/[+-]/.test(body)) return body;
        var terms = parseTerms(body);
        if (!terms.length || !terms.some(t => hasName.test(t.body))) return body;
        return joinTerms(terms.map(t => hasName.test(t.body)
          ? { sign: t.sign === '-' ? '+' : '-', body: t.body }
          : t));
      };
      var flipText = text => ('' + text).replace(/\(([^()]+)\)/g, (m, body) => {
        var flipped = flipBody(body);
        return flipped === body ? m : '(' + flipped + ')';
      });
      var nextPre = prelude.slice();
      nextPre[c.idx] = ('' + nextPre[c.idx]).replace('=' + c.body, '=-' + c.body);
      for (var i = c.idx + 1; i < nextPre.length; i++) nextPre[i] = flipText(nextPre[i]);
      var nextExpr = expr.map(flipText);
      if (signs(nextPre.slice(c.idx)) + signs(nextExpr) >= signs(prelude.slice(c.idx)) + signs(expr)) continue;
      prelude = nextPre;
      expr = nextExpr;
    }
  };
  flipScaledHelperSigns();

  var refsOf = text => new Set(('' + text).match(/[_A-Za-z]\w*/g) || []);
  var needed = new Set();
  expr.forEach(e => refsOf(e).forEach(n => needed.add(n)));
  var keep = new Array(prelude.length).fill(true);
  for (var i = prelude.length - 1; i >= 0; i--) {
    var name = entryName(prelude[i]);
    if (!name) continue;
    if (!needed.has(name)) { keep[i] = false; continue; }
    var body = ('' + prelude[i]).slice(('' + prelude[i]).indexOf('=') + 1);
    refsOf(body).forEach(n => needed.add(n));
  }
  prelude = prelude.filter((_, i) => keep[i]);
  return [prelude, expr];
};

export default rationalPolynomial;
