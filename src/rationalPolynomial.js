//@ts-check
///////////////////////////////////////////////////////////////////////////////////////////
//
// A Rational Polynomial maintains a numerator polynomial and a *factored* denominator.
// These are used as the coefficients for a symbolic geometric algebra module.
//
// A rationalPolynomial element is [numerator, factors] where factors is a list of
// [polynomial, exponent] pairs (empty list = denominator 1). Keeping the denominator
// factored means powers like (a0²+a1²+a2²)³ are never expanded to multinomials and
// never need to be re-factored for CSE emission.
//
// e.g.
//  (3x^2 + 2y) / (2x^3 + 2)²
//  ==> [[[3,x,x],[2,y]], [[[[2,x,x,x],[2]], 2]]]
//
///////////////////////////////////////////////////////////////////////////////////////////

import polynomial from './polynomial.js';

var rationalPolynomial = function(coeff) {
  return (coeff === 0)            ? 0:                     // keep zero scalar
         (coeff === 0n)           ? 0n:                    // keep 0n bigint
         (coeff instanceof Array) ? coeff:                 // Already rationalPolynomial
         [polynomial(coeff), []]                           // [poly, factor list]
}

var gcd = polynomial.gcd;
rationalPolynomial.opCost = polynomial.opCost;
var isOnePoly = p => Array.isArray(p) && p.length === 1 && p[0].length === 1 && (p[0][0] === 1 || p[0][0] === 1n);
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
var coefficientContent = (poly) => {
  if (!Array.isArray(poly)) return 1;
  var g = 0;
  for (var t of poly) {
    var c = Math.abs(t[0]);
    if (!Number.isInteger(c)) return 1;
    g = g ? gcd(g, c) : c;
    if (g === 1) return 1;
  }
  return g || 1;
};
var divideCoefficients = (poly, c) => c === 1 || !Array.isArray(poly) ? poly : poly.map(t => [t[0] / c, ...t.slice(1)]);

// --- factored denominator machinery -----------------------------------------------------
// A factor list F is [[Q, n], ...] with Q an expanded sorted polynomial and n >= 1.

var keyF = F => F.map(([q, n]) => '(' + q + ')^' + n).join('*');
var sortF = F => F.sort((a, b) => a[0] + '' < b[0] + '' ? -1 : 1);

// Multiply two factor lists: merge by polynomial identity, summing exponents.
var mulF = (Fa, Fb) => {
  var res = Fa.map(f => f.slice()), i;
  for (var [q, n] of Fb) {
    for (i = 0; i < res.length; i++) if (samePoly(res[i][0], q)) { res[i][1] += n; break; }
    if (i === res.length) res.push([q, n]);
  }
  return sortF(res);
};

// Split factor lists into [common, restA, restB] (gcd by factor identity, min exponents).
var splitF = (Fa, Fb) => {
  var g = [], ra = [], rb = Fb.map(f => f.slice());
  for (var [q, n] of Fa) {
    var hit = rb.find(f => f[1] > 0 && samePoly(f[0], q));
    if (hit) {
      var c = Math.min(n, hit[1]);
      g.push([q, c]);
      if (n - c) ra.push([q, n - c]);
      hit[1] -= c;
    } else ra.push([q, n]);
  }
  return [g, ra, rb.filter(f => f[1] > 0)];
};

// Expand a factor list to a single polynomial (inv, add cross-multiplies, formatting).
// Sqrt atom powers stay unexpanded atom products, mirroring the numerator side where
// later multiplications reduce the pairs.
var expandF = (F) => F.reduce((r, [q, n]) => { for (var i = 0; i < n; i++) r = polynomial.mul(r, q); return r; }, [[1]]);

// Squared sqrt atoms reduce to their radicand: (√R)^2n -> R^n. Applied by mul only —
// additions keep the raw factor product, like the numerator side.
var reduceSqrtF = (F) => {
  if (!F.some(([q, n]) => n >= 2 && q.length === 1 && q[0].length === 2 && q[0][0] === 1 && sqrtRoots.has(q[0][1]))) return F;
  return F.flatMap(([q, n]) => {
    if (n < 2 || q.length !== 1 || q[0].length !== 2 || q[0][0] !== 1 || !sqrtRoots.has(q[0][1])) return [[q, n]];
    var res = [[sqrtRoots.get(q[0][1]), n >> 1]];
    if (n & 1) res.push([q, 1]);
    return res;
  }).reduce((acc, f) => mulF(acc, [f]), []);
};

// Cancel a numerator against a factor list: sqrt-atom squares cancel against their
// radicand, whole factors by exact division, then shared numeric content and shared
// monomial factors for simple (n=1) factors.
var cancelF = (N, F) => {
  var out = [];
  for (var [q, n] of F) {
    var root = q.length === 1 && q[0].length === 2 && q[0][0] === 1 ? sqrtRoots.get(q[0][1]) : undefined;
    while (n > 1 && root) {
      var dr = polynomial.divide(N, root);
      if (!dr) break;
      N = dr; n -= 2;
    }
    while (n > 0) {
      var d = polynomial.divide(N, q);
      if (!d) break;
      N = d; n--;
    }
    if (n === 0 || isOnePoly(q)) continue;
    if (n === 1) {
      var cg = gcd(coefficientContent(N), coefficientContent(q));
      if (cg > 1) { N = divideCoefficients(N, cg); q = divideCoefficients(q, cg); }
      var common = intersectSorted(commonFactors(N), commonFactors(q));
      if (common.length) { N = divideMonomial(N, common); q = divideMonomial(q, common); }
      if (isOnePoly(q)) continue;
    }
    out.push([q, n]);
  }
  return [N, out];
};

// Cancel, normalize and detect the constant 1 result.
var finishR = (N, F) => {
  [N, F] = cancelF(N, F);
  if (!F.length && isOnePoly(N)) return 1;
  return [N, sortF(F)];
};

var polyFromRational = (a) => {
  a = rationalPolynomial(a);
  if (a === 0 || a === 0n) return 0;
  if (!Array.isArray(a)) return polynomial(a);
  return a[1].length ? null : a[0];
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
    var N = reducePolynomialByRules(a[0], rules);
    if (N === 0 || N === 0n) return 0;
    return finishR(N, a[1].map(([q, n]) => [reducePolynomialByRules(q, rules), n]));
  };
  return Array.isArray(expr) ? expr.map(reduceOne) : reduceOne(expr);
};

rationalPolynomial.sqrt = (a) => {
  a = rationalPolynomial(a);
  if (a === 0 || a === 0n) return 0;
  if (a === 1 || a === 1n) return 1;
  var [n, f] = a;
  if (isOnePoly(n) && !f.length) return 1;
  // Exact numeric roots: numerator and (constant) denominator factors.
  var nRoot = sqrtConst(constPoly(n)), dConst = 1;
  for (var [q, e] of f) {
    var c = constPoly(q);
    if (c === undefined) { dConst = undefined; break; }
    dConst *= Math.pow(c, e);
  }
  var dRoot = dConst === undefined ? undefined : sqrtConst(dConst);
  if (nRoot !== undefined && dRoot !== undefined) return dRoot === 1 ? nRoot : [polynomial(nRoot), [[polynomial(dRoot), 1]]];
  if (!f.length) return [[ [1, sqrtAtom(n)] ], []];
  return '('+rationalPolynomial.format(a)+')**.5';
};

// Add two rational polynomials.
// general formula (a/b) + (c/d) = (a*(d/g) + c*(b/g)) / (g*(b/g)*(d/g)), g = gcd(b,d)
// exception for same denominator (a/b) + (c/b) = (a+c)/b

rationalPolynomial.add = (a,b)=>{
  // Convert potential number, bigint and string inputs to rationalPolynomial format.
  a = rationalPolynomial(a); b = rationalPolynomial(b);
  // If either one is zero, return the other.
  if (a===0) return b; if (b===0) return a;
  if (a===0n) return b; if (b===0n) return a;
  // split numerator and denominator factors.
  var [na,fa] = a, [nb,fb] = b;
  // Handle same denominator
  if (keyF(fa) === keyF(fb)) {
    var nn = polynomial.add(na,nb);
    if (nn===0 || nn[0][0]===0) return 0;
    if (nn===0n || nn[0][0]===0n) return 0n;
    return finishR(nn, fa);
  }
  // General addition: cross-multiply only the non-shared factors.
  var [g, ra, rb] = splitF(fa, fb);
  var nn = polynomial.add(polynomial.mul(na, expandF(rb)), polynomial.mul(nb, expandF(ra)));
  // Return zero if the numerator is zero.
  if (nn===0 || nn[0][0]===0) return 0;
  if (nn===0n || nn[0][0]===0n) return 0n;
  return finishR(nn, mulF(g, mulF(ra, rb)));
}

// Multiply two rational polynomials. (a/b) * (c/d) = (a*c)/(b*d)

rationalPolynomial.mul = (a,b)=>{
  // Convert number, bigint, string inputs to rationalPolynomial format.
  a = rationalPolynomial(a); b = rationalPolynomial(b);
  // If either is zero, return zero.
  if (a===0 || b===0) return 0;
  if (a===0n|| b===0n) return 0n;
  // If either is one, return the other
  if (a===1 || a===1n) return b;
  if (b===1 || b===1n) return a;
  // split and perform the multiplication; denominators merge factor-wise.
  var [na,fa] = a, [nb,fb] = b;
  var nn = polynomial.mul(na,nb);
  if (hasSqrtPair(nn)) nn = reduceSqrtPairs(nn);
  // If the numerator ends up zero, return zero.
  if (nn===0 || nn[0][0]===0) return 0;
  return finishR(nn, reduceSqrtF(mulF(fa, fb)));
}

// Invert a rational polynomial. 1/(a/b) = (b/a)

rationalPolynomial.inv = (a)=>{
  a = rationalPolynomial(a);
  if (a===0 || a===0n) return 0;
  return finishR(expandF(a[1]), [[a[0], 1]]);
}

// Negate a rational polynmial. -(a/b) = (-a/b)

rationalPolynomial.neg = (a)=>{
  a = rationalPolynomial(a);
  if (a===0 || a===0n) return 0;
  return [polynomial.neg(a[0]),a[1]];
}

// Format a rational polynomial. The denominator is emitted as a product of its
// (parenthesized) factors, never expanded.

rationalPolynomial.format = (a)=>{
  if (a===0) return 0;
  if (!(a instanceof Array)) return a;
  var [N,F] = a;
  if (F === undefined || !F.length) return polynomial.format(N);
  var fn = polynomial.format(N);
  if (fn == '0') return 0;
  if (fn === '') fn = '1';
  var dn = polynomial.format(F.length === 1 && F[0][1] === 1 ? F[0][0] : expandF(F));
  if (fn==dn) return 1;
  if (dn=='1' || dn=='') return fn;
  return '('+fn+')/('+dn+')';
}
  
// Perform CSE on a collection of rationalPolynomial expressions.
// A factor list is "atomic" when it is a single input variable to the first power.
var atomicVar = F => F.length === 1 && F[0][1] === 1 && F[0][0].length === 1 && F[0][0][0].length === 2
                  && F[0][0][0][0] === 1 && typeof F[0][0][0][1] === 'string' ? F[0][0][0][1] : undefined;

var rationalCSE = (expr, protect, isolate, polyCSE)=>{
  expr         = expr.map(x=>rationalPolynomial(x));
  // Split numerators over composite sqrt denominators: when F contains a sqrt atom
  // and its radicand s, divide N = P*s + Q so N/(√s·s) = P/√s + Q/(√s·s). The parts
  // become separate CSE slots (sharing sums/products with everything else) and are
  // recombined as a sum of fractions when building the result.
  // Term cancellation can defeat lead-term division (e.g. a6·s + a3·ns0 where the
  // a3²a6 terms cancel), so also try single input variables as quotient candidates.
  var bestSplit = (N, s) => {
    var [P, Q] = polynomial.divmod(N, s);
    var best = P && Q ? { P, Q } : null;
    var vars = new Set();
    N.forEach(t => { for (var fi = 1; fi < t.length; fi++) if (typeof t[fi] === 'string') vars.add(t[fi]); });
    for (var v of vars) for (var sgn of [1, -1]) {
      var Qv = polynomial.add(N, polynomial.neg(polynomial.mul([[sgn, v]], s)));
      // <=: a split that keeps the term count can still win through cross-component
      // sharing of the remainder (e.g. -a2*t0 reusing the shared t0*_iv1 product).
      if (Array.isArray(Qv) && Qv.length + 1 <= N.length && (!best || Qv.length < best.Q.length))
        best = { P: [[sgn, v]], Q: Qv };
    }
    return best;
  };
  var splits = new Map();
  expr.forEach((x, i) => {
    if (!Array.isArray(x)) return;
    var [N, F] = x;
    for (var [s, k] of F) {
      // A factor can be peeled when the remaining denominator is still real: either s
      // appears squared (n>=2), or the factor list holds a sqrt atom with radicand s.
      if (k < 2 && !F.some(([q]) => q.length === 1 && q[0].length === 2 && q[0][0] === 1 && samePoly(sqrtRoots.get(q[0][1]) || 0, s))) continue;
      var split = bestSplit(N, s);
      if (!split) continue;
      var F1 = F.flatMap(([q, n]) => samePoly(q, s) ? (n > 1 ? [[q, n - 1]] : []) : [[q, n]]);
      expr[i] = [split.P, F1];
      splits.set(i, expr.length);
      expr.push([split.Q, F]);
      break;
    }
  });
  // Collect and remember all unique denominators (factor lists, keyed).
  var ex2      = expr.map(x=>x&&x[0]);
  var d        = expr.map(x=>x&&[x[1],keyF(x[1])]);
  var degF     = F => F.reduce((s,[q,n])=>s + n*q.reduce((m,t)=>Math.max(m, t.length - 1), 0), 0);
  var unique_d = Object.values(Object.fromEntries(d.filter(Boolean).map(x=>[x[1],x[0]])))
                       .filter(F=>F.length)
                       .sort((a,b)=>degF(a)-degF(b) || (keyF(a) < keyF(b) ? -1 : keyF(a) > keyF(b) ? 1 : 0))
                       .map((F,i)=>['D'+(i+1),F,keyF(F)]);
  var atomicSubs = new Map();
  unique_d.forEach(D => {
    var v = atomicVar(D[1]);
    if (v) atomicSubs.set(v, D[0]);
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
      var isAtomic = atomicSubs.get(atomicVar(D[1])) === D[0];
      if (!isAtomic) { D[1] = D[1].map(([q,n]) => [substituteFactor(q), n]); D[2] = keyF(D[1]); }
      keyMap.set(oldKey, D[2]);
    });
    d.forEach(x => { if (x && keyMap.has(x[1])) x[1] = keyMap.get(x[1]); });
  }
  // Perform CSE on numerators only (denominators must not be transformed by isolation).
  var res      = polyCSE(ex2, protect, isolate);
  var r1       = res[1];
  // Now we do the full replace.
  if (unique_d.length) {
    // Substitute the denominators and expressions.
    // @ts-ignore
    var r  = r1.map((x,i)=>{
      var ud = unique_d.find((D)=>D[2]==d[i][1]);
      return ud ? [x,[[[[1,ud[0]]],1]]] : [x,1];
    });
    // Add all unique denominators to the precalc. Each base factor is emitted once and
    // powers/products reuse the emitted names, e.g. PGA bivector inverse: D2=D1*D1*D1.
    // Also reuse atomic shared-product helpers from the numerator prelude (e.g. a0a0=a0*a0)
    // so D1=a0*a0+a1*a1+a2*a2 becomes D1=a0a0+a1a1+a2a2.
    var emitted = [], rules = polynomial.atomicProductRules(res[0]), atomicHead = [];
    var emittedName = q => { for (var p of emitted) if (p.poly && p.poly.length === q.length && polynomial.add(q, polynomial.neg(p.poly)) === 0) return p.name; return null; };
    unique_d.forEach(D=>{
      var F = D[1];
      if (atomicSubs.get(atomicVar(F)) === D[0]) {
        var atomStr = F[0][0][0][1];
        atomicHead.push('\n        '+D[0]+'='+atomStr);
        // Register under the raw atom and its substituted alias so powers reuse the name;
        // remember the radicand so factors equal to it emit as name*name.
        emitted.push({ name: D[0], poly: F[0][0], root: sqrtRoots.get(atomStr) }, { name: D[0], poly: [[1, D[0]]] });
        return;
      }
      // Single factor to the first power: the D name is the factor itself.
      if (F.length === 1 && F[0][1] === 1) {
        var rhs = emittedName(F[0][0]) || polynomial.applyAtomicProducts(polynomial.format(F[0][0]), rules);
        res[0].push('\n        '+D[0]+'='+rhs);
        emitted.push({ name: D[0], poly: F[0][0] });
        return;
      }
      // Powers and products: resolve every factor to a name and emit the product.
      // Factors equal to an emitted sqrt atom's radicand resolve to atom*atom, so
      // e.g. the even sqrt denominator √s·s emits as D2=D1*D1*D1 (no sum recompute),
      // and the PGA bivector inverse s³ emits as D2=D1*D1*D1.
      var parts = [];
      F.forEach(([q, n], qi) => {
        var rooted = emitted.find(p => p.root && p.root.length === q.length && polynomial.add(q, polynomial.neg(p.root)) === 0);
        if (rooted) { for (var k = 0; k < 2*n; k++) parts.push(rooted.name); return; }
        var qName = emittedName(q);
        if (!qName) {
          qName = D[0] + 'q' + (qi || '');
          res[0].push('\n        '+qName+'='+polynomial.applyAtomicProducts(polynomial.format(q), rules));
          emitted.push({ name: qName, poly: q });
        }
        for (var k = 0; k < n; k++) parts.push(qName);
      });
      res[0].push('\n        '+D[0]+'='+parts.join('*'));
      emitted.push({ name: D[0], poly: null });
    });
    if (atomicHead.length) res[0].unshift(...atomicHead);
  } else var r = r1.map((x,i)=>[x,1]);
  // Recombine split fractions as formatted sums; drop the extra slots.
  if (splits.size) {
    for (var [i, j] of splits) {
      var fa = rationalPolynomial.format(r[i]), fb = rationalPolynomial.format(r[j]);
      r[i] = fa === 0 ? fb : fb === 0 ? fa : '' + fa + ((('' + fb)[0] === '-') ? '' : '+') + fb;
    }
    var drop = new Set(splits.values());
    r = r.filter((_, k) => !drop.has(k));
  }
  var out = [res[0], r];
  out.completed = res.completed;
  return out;
}

rationalPolynomial.cse = (expr, protect, isolate, opts)=>rationalCSE(expr, protect, isolate, (e,p,i)=>polynomial.cse(e,p,i,opts));

// Late string-level cleanup after rational formatting has exposed
// denominator helpers and factored numerators. Verified against atomic square
// definitions in the prelude before rewriting.
var escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

  var squareSumName = new Map();
  defs.forEach((body, name) => {
    if (!/^[^+\-]+(?:\+[^+\-]+)+$/.test(body)) return;
    var terms = body.split('+');
    if (terms.every(t => squareRoot(t))) squareSumName.set(terms.slice().sort().join('+'), name);
  });
  

  // Sign-flip a helper definition (D=body -> D=-body) when its uses are mostly
  // negative: counts negated vs positive divisions by D (and, with opts.muls,
  // multiplications), flips the prelude entry and rewrites all uses when negated
  // uses outnumber positive ones by more than opts.thresh. Bails if D appears in
  // any other (unrecognized) context.
  var flipDef = (name, { muls = false, thresh = 1, one = true, setDef = true } = {}) => {
    var def = defs.get(name);
    if (!def || def[0] === '-') return false;
    var escD = escapeRe(name);
    var arg = one ? '(' + atom + '|1)' : '(' + atom + ')';
    var negDiv = new RegExp('\\(-' + arg + '\\)/\\(' + escD + '\\)', 'g');
    var posDiv = new RegExp('(?<![-_A-Za-z0-9\\]])\\(' + arg + '\\)/\\(' + escD + '\\)', 'g');
    var negMul = new RegExp('-(' + atom + ')\\*' + escD + '(?![_A-Za-z0-9\\[])', 'g');
    var posMul = new RegExp('(?<![-_A-Za-z0-9\\]])\\+(' + atom + ')\\*' + escD + '(?![_A-Za-z0-9\\[])', 'g');
    var neg = 0, pos = 0, safe = true;
    expr.forEach(e => {
      var s = ('' + e).replace(negDiv, () => { neg++; return ''; });
      if (muls) s = s.replace(negMul, () => { neg++; return ''; });
      s = s.replace(posDiv, () => { pos++; return ''; });
      if (muls) s = s.replace(posMul, () => { pos++; return ''; });
      if (new RegExp('(?<![_A-Za-z0-9\\]])' + escD + '(?![_A-Za-z0-9\\[])').test(s)) safe = false;
    });
    if (!safe || neg <= pos + thresh) return false;
    var negDef = /^[^()/-]+(?:\+[^()/-]+)+$/.test(def) ? '-' + def.replace(/\+/g, '-') : '-' + def;
    prelude = prelude.map(entry => /^([_A-Za-z]\w*)=/.exec(('' + entry).trim())?.[1] === name ? ('' + entry).replace('=' + def, '=' + negDef) : entry);
    expr = expr.map(e => {
      var held = [];
      var s = ('' + e).replace(posDiv, (_, x) => '__HELD' + (held.push('(-' + x + ')/(' + name + ')') - 1) + '__');
      if (muls) s = s.replace(posMul, (_, x) => '__HELD' + (held.push('-' + x + '*' + name) - 1) + '__');
      s = s.replace(negDiv, '($1)/(' + name + ')');
      if (muls) s = s.replace(negMul, '+$1*' + name);
      return s.replace(/__HELD(\d+)__/g, (_, i) => held[i]);
    });
    if (setDef) defs.set(name, negDef);
    return true;
  };

  for (var D of squareSumName.values()) flipDef(D, { muls: true, thresh: 0, one: false, setDef: false });
  defs.forEach((body, name) => {
    if (/^[_A-Za-z]\w*(?:\[\d+\])?$/.test(body)) flipDef(name);
  });
  defs.forEach((body, name) => {
    if (!/[+]/.test(body) || /[-/()]/.test(body)) return;
    flipDef(name);
  });
  defs.forEach((body, name) => {
    var m = /^([_A-Za-z]\w*)\*\1$/.exec(body);
    if (m && defs.has(m[1])) flipDef(name);
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
    var esc = escapeRe(root);
    var rex = new RegExp(esc, 'g');
    expr = expr.map(e => ('' + e).replace(rex, name));
  }

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
    var esc = escapeRe(substr);
    var rex = new RegExp(esc, 'g');
    expr = expr.map(e => ('' + e).replace(rex, name));
  }


  var splitTopTerms = polynomial.splitTerms;
  var parsedExpr = expr.map(e => splitTopTerms('' + e));
  var outputPairs = polynomial.sharedTermPairs(parsedExpr, { skip: /[/?]/ });
  polynomial.claimTermPairs(parsedExpr, outputPairs, key => {
    var name = nextName();
    prelude.push(name + '=' + key);
    return name;
  });
  expr = parsedExpr.map((terms, ei) => {
    if (!terms.some(t => t && t.replaced)) return expr[ei];
    return polynomial.joinTerms(terms.filter(Boolean));
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

  var factorCommonNumericCoefficients = list => list.map(entry => {
    var m = /^([_A-Za-z]\w*)=(.+)$/.exec(('' + entry).trim());
    var lhs = m && m[1], rhs = m ? m[2] : '' + entry;
    if (!/[+-]/.test(rhs) || /[()/]/.test(rhs)) return entry;
    var terms = splitTopTerms(rhs);
    if (terms.length < 3) return entry;
    var parsed = terms.map(t => {
      var nm = /^(\d+)\*(.+)$/.exec(t.body);
      return nm && { sign: t.sign, coeff: nm[1], rest: nm[2] };
    });
    var factored = parsed.filter(Boolean);
    if (factored.length < 2) return entry;
    var coeff = factored[0].coeff, sign = factored[0].sign;
    if (!factored.every(t => t.coeff === coeff)) return entry;
    var body = factored.map(t => (t.sign === sign ? '+' : '-') + t.rest).join('').replace(/^\+/, '');
    var out = '', emitted = false;
    for (var i = 0; i < terms.length; i++) {
      if (!parsed[i]) out += terms[i].sign + terms[i].body;
      else if (!emitted) { out += sign + coeff + '*(' + body + ')'; emitted = true; }
    }
    out = out.replace(/^\+/, '');
    return lhs ? lhs + '=' + out : out;
  });
  prelude = factorCommonNumericCoefficients(prelude);
  expr = factorCommonNumericCoefficients(expr);

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
      var esc = escapeRe(prod);
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
      var esc = escapeRe(term);
      var rex = new RegExp('(?<![_A-Za-z0-9\\]])2\\*' + esc + '(?![_A-Za-z0-9\\[])', 'g');
      for (var i = insertAt + 1; i < prelude.length; i++) prelude[i] = ('' + prelude[i]).replace(rex, name);
      expr = expr.map(e => ('' + e).replace(rex, name));
    }
  }

  var flipScaledHelperSigns = () => {
    var parseTerms = polynomial.splitTerms;
    var joinTerms = terms => polynomial.joinTerms([...terms].sort((a, b) => (a.sign === '-' ? 1 : 0) - (b.sign === '-' ? 1 : 0)));
    var signs = xs => xs.reduce((s, x) => s + ((x + '').match(/[+-]/g) || []).length, 0);
    var candidates = prelude.map((entry, idx) => {
      var m = /^([_A-Za-z]\w*)=(.+)$/.exec(('' + entry).trim());
      var p = m && { name: m[1], body: m[2] };
      return p && /^2\*[_A-Za-z]\w*$/.test(p.body) ? { idx, ...p } : null;
    }).filter(Boolean);
    for (var c of candidates) {
      var esc = escapeRe(c.name);
      var hasName = new RegExp('(?<![_A-Za-z0-9\\]])' + esc + '(?![_A-Za-z0-9\\[])');
      var flipBody = body => {
        if (!hasName.test(body)) return body;
        var terms = parseTerms(body);
        if (!terms.length || !terms.some(t => hasName.test(t.body))) return body;
        return joinTerms(terms.map(t => hasName.test(t.body)
          ? { sign: t.sign === '-' ? '+' : '-', body: t.body }
          : t));
      };
      // Flip uses inside paren groups, and also top-level additive terms whose
      // reference sits outside any parens (paren-free hoisted products).
      var flipText = text => {
        var s = ('' + text).replace(/\(([^()]+)\)/g, (m, body) => {
          var flipped = flipBody(body);
          return flipped === body ? m : '(' + flipped + ')';
        });
        var eq = s.indexOf('='), prefix = eq >= 0 && /^[_A-Za-z]\w*=/.test(s) ? s.slice(0, eq + 1) : '';
        var rhs = s.slice(prefix.length);
        if (!hasName.test(rhs.replace(/\([^()]*\)/g, ''))) return s;
        var terms = parseTerms(rhs), changed = false;
        terms = terms.map(t => {
          if (!hasName.test(t.body.replace(/\([^()]*\)/g, ''))) return t;
          changed = true;
          return { sign: t.sign === '-' ? '+' : '-', body: t.body };
        });
        return changed ? prefix + joinTerms(terms) : s;
      };
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
