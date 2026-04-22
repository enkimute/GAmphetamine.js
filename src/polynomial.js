// @ts-check
///////////////////////////////////////////////////////////////////////////////////////////
//
// Simple (and fast!) symbolic polynomials. For symbolic computations in 
// GA, we use symbolic rational polynomials as coefficients. 
// 
// We provide a procedural API that is capable of dealing with three types
// - number                            Work with standard floats
// - single string                     Single variables e.g. "x" .. "-x" also supported.
// - [ [ a * ... ] + ... ]             Polynomials as double arrays.
//
// Example
//
//   x² + xy + 3  = [ [1, 'x', 'x'], [1, 'x', 'y'], [3] ] 
//
///////////////////////////////////////////////////////////////////////////////////////////

var polynomial = function(coeff) {
  return coeff===0?0:                                  // Keep zero flat.
         (typeof coeff === 'number')?[[coeff]]:        // Handle numerical values
         (typeof coeff === 'bigint')?[[coeff]]:        // Handle numerical values
         (coeff instanceof Array)?coeff:               // Was already converted
         (typeof coeff === 'string' && coeff[0] === '-')?[[-1,coeff.slice(1)]]:     // support '-x' as name.
         [[1,coeff]];                                  // all other cases, variable name.
}

// Compare two polynomials
// returns -1 if a<b, 0 if a=b and +1 if a>b

polynomial.compare = function(a,b) {
  // bit of assumption on alphabetical sorting here, undefined is biggest.
  if (a===undefined) return 1; if (b===undefined) return -1;
  // start comparing both strings up to the length of the shortest one.
  // (i.e. alphabetical order takes precedence over length, 'aaa' before 'ba')
  var la = a.length, lb = b.length;
  for (var i=1, l=Math.min(la,lb); i<l; ++i) 
    if (a[i] < b[i]) return -1; 
    else if (a[i] > b[i]) return 1;
  // If one is a substring of the other return the difference in length  
  return la - lb;    
}

// Add two polynomials, keep both sorted.

polynomial.add = function(a,b,res=[]) {
  // If either input is zero, return the other.
  if (a===0) return b; if (b===0) return a;
  // Make sure both inputs are polynomials.
  a = polynomial(a); b = polynomial(b);
  // start with two indices and empty result.
  var ai=0, bi=0, al=a.length, bl=b.length, ri=0, ea=a[0], eb=b[0];
  // Now consume from both lists in order. (this keeps the result sorted)
  while (true) {
    // Grab the two elements under consideration.
    var diff = polynomial.compare(ea, eb);
    // See which one is smallest.
         if (diff < 0) { res[ri++]=ea; ++ai; ea=a[ai]; } 
    else if (diff > 0) { res[ri++]=eb; ++bi; eb=b[bi]; } 
    // If they are the same, add their scalar factors, store only one and continue
    else { ea = ea.slice(); ea[0] += eb[0]; if (ea[0]!==0) res[ri++]=ea; ++ai; ++bi; ea=a[ai]; eb=b[bi]; }
    // Done when at the end of both lists.
    if (ai === al && bi === bl) break;
  }
  // Detect zero, return result.
  return res.length==0?0:res;
}

// Multiply two polynomials, keep them sorted and simplify along the way.

polynomial.mul = function(a,b){
  // Quick bail zero.
  if (a===0 || b===0) return 0;
  // Convert inputs to polynomial format
  a = polynomial(a); b = polynomial(b);
  // Multiply all terms
  var res = [], al=a.length, bl=b.length;
  for (var ai=0; ai<al; ++ai) for (var bi=0; bi<bl; ++bi) {
    var A=a[ai], B=b[bi], t=[A[0]*B[0]], i=1, j=1;
    // collect factors
    while (true) { 
      var ea=A[i], eb=B[j];
      if (ea === undefined && eb === undefined) break;
      //@ts-ignore
      if (eb === undefined || ea < eb) { if ((typeof a != 'bigint') || isNaN(a)) t.push(ea); else t[0]*=ea; ++i }
                                  else { if ((typeof b != 'bigint') || isNaN(eb)) t.push(eb); else t[0]*=eb; ++j }
    }
    // accumulate
    if (res.length===0) res[0] = t; else res = polynomial.add(res,[t]);
  }
  return res;
}

// Negate a polynomial.
//@ts-ignore
polynomial.neg = a => a===0?0:polynomial(a).map(x=>[-x[0],...x.slice(1)]);

// Format a polynomial

polynomial.format = (...args)=>args.map(a=>a.join?a.map(x=>x.length==1?x:x.filter(x=>x!==1).map(x=>x.join?'('+polynomial.format(x)+')':x).join('*')).sort((a,b)=>a[0]=="-"?1:b[0]=="-"?-1:0).join('+').replace(/\+\-/g,'-').replace(/\b1\*/g,''):a).join('')

// Common Subexpression Elimination.
//
// This is quite involved. split up as the old do it all in place method was no longer cutting it. 

// Phase 1: Pre-isolation shared sum detection.
// For each (component, variable) pair, compute residuals (terms with variable removed).
// Normalize by GCD, sort, sign. Match across components — same sum in 2+ components
// is a shared sub-expression. Extract greedily, replacing original terms.
// Returns count of shared sums found.
var findSharedSums = (expr, isoVars, prelude, startCount = 0, sumMap = null) => {
  if (!isoVars.length || expr.filter(e => e instanceof Array).length < 2) return 0;
  var resMap = new Map(), used = new Set(), sumCount = startCount;
  // Build residuals for each (component, variable) pair.
  for (var ci = 0; ci < expr.length; ci++) {
    var e = expr[ci]; if (!(e instanceof Array)) continue;
    for (var v of isoVars) {
      var rTerms = [], rIdx = [];
      for (var ti = 0; ti < e.length; ti++) {
        var t = e[ti], idx = -1;
        for (var fi = 1; fi < t.length; fi++) if (t[fi] === v) { idx = fi; break; }
        if (idx < 0) continue;
        rTerms.push([...t.slice(0, idx), ...t.slice(idx + 1)]); rIdx.push(ti);
      }
      if (rTerms.length < 2) continue;
      // Normalize and register (full residual + 3-term subsets of 4-term)
      var sizes = [rTerms.length];
      if (rTerms.length === 4) sizes.push(3);
      for (var sz of sizes) {
        var subsets = sz === rTerms.length ? [[...rTerms.keys()]] :
          [[1, 2, 3], [0, 2, 3], [0, 1, 3], [0, 1, 2]];
        for (var si of subsets) {
          var sub = si.map(i => rTerms[i]), subI = si.map(i => rIdx[i]);
          // GCD of absolute coefficients
          var g = Math.abs(sub[0][0]);
          for (var i = 1; i < sub.length; i++) { var a = g, b = Math.abs(sub[i][0]); while (b) { var tmp = b; b = a % b; a = tmp; } g = a; }
          // Normalize: divide by GCD, sort by factors, ensure positive first
          var norm = sub.map(t => [t[0] / g, ...t.slice(1)]);
          norm.sort((a, b) => { var sa = a.slice(1).join(','), sb = b.slice(1).join(','); return sa < sb ? -1 : sa > sb ? 1 : 0; });
          var sign = 1; if (norm[0][0] < 0) { norm = norm.map(t => [-t[0], ...t.slice(1)]); sign = -1; }
          var key = norm.map(t => t.join(',')).join('|');
          if (!resMap.has(key)) resMap.set(key, []);
          resMap.get(key).push({ comp: ci, v: v, sign: sign, gcd: g, idx: subI, norm: norm });
        }
      }
    }
  }
  // Find sums appearing in 2+ different components, greedily extract.
  var cands = []; for (var [key, occs] of resMap) {
    var cs = new Set(occs.map(o => o.comp));
    if (cs.size >= 2) cands.push({ key, occs, score: cs.size * 10 + occs.length });
  }
  cands.sort((a, b) => b.score - a.score);
  var replacements = [];
  for (var cand of cands) {
    var valid = cand.occs.filter(o => !o.idx.some(i => used.has(o.comp + ':' + i)));
    var vc = new Set(valid.map(o => o.comp)); if (vc.size < 2) continue;
    var sn = 't' + sumCount++;
    var norm = cand.occs[0].norm;
    prelude.push(sn + '=' + polynomial.format(norm));
    // Build substitution map for 2-term sums: posVar = tn + negVar
    if (sumMap && norm.length === 2 && norm[0].length === 2 && norm[1].length === 2)
      sumMap.set(norm[0][1], {tn: sn, offset: norm[1][1]});
    for (var occ of valid) {
      occ.idx.forEach(i => used.add(occ.comp + ':' + i));
      replacements.push({ comp: occ.comp, indices: occ.idx, term: [occ.gcd * occ.sign, occ.v, sn] });
    }
  }
  // Apply all replacements at once to avoid index invalidation.
  for (var ci = 0; ci < expr.length; ci++) {
    var e = expr[ci]; if (!(e instanceof Array)) continue;
    var repls = replacements.filter(r => r.comp === ci);
    if (!repls.length) continue;
    var removeSet = new Set();
    repls.forEach(r => r.indices.forEach(i => removeSet.add(i)));
    var newTerms = e.filter((_, i) => !removeSet.has(i));
    repls.forEach(r => newTerms.push(r.term));
    e.splice(0, e.length, ...newTerms);
  }
  return sumCount;
}

// Phase 2: Variable isolation.
// Factor out each variable in isoList from expressions that contain it in 2+ terms.
// Collects common factors, handles sign normalization, builds nested structure.
var isolate = (expr, isoList) => {
  isoList.forEach(p => {
    // @ts-ignore
    expr.forEach((e) => {
      if (!(e instanceof Array)) return;

      // Split terms into those with and without the factor to isolate.
      // @ts-ignore
      var terms_with_p = e.filter(product => ~product.indexOf(p) || ~product.indexOf(-p)).map(t => {
        var r = t.filter((f, i) => i != t.indexOf(p)).map(f => f == -p ? -1 : f);
        if (r.length && typeof r[0] === 'string') r.unshift(1);
        return r;
      });
      var terms_without_p = e.filter(product => !~product.indexOf(p) && !~product.indexOf(-p));

      if (terms_with_p.length <= 1) return;

      // Count how many common factors there are and collect them.
      var common = {}, commonE = {};
      terms_with_p.forEach(t => {
        var thisrun = {};
        t.forEach(f => {
          var n = ('' + f).replace('-', ''); if (n === '1') return;
          if (thisrun['_' + n] === undefined) {
            common['_' + n] = (common['_' + n] || 0) + 1;
            commonE['_' + n] = f < 0 ? -f : f;
            thisrun['_' + n] = 1;
          }
        });
      })
      // @ts-ignore
      common = Object.entries(common).filter(([n, c]) => c == terms_with_p.length).map(([n, c]) => commonE[n]);

      // If there are common factors, remove the first one from each term.
      if (common.length) {
        // @ts-ignore
        terms_with_p.forEach((t) => {
          for (var ci = 0; ci < common.length; ci++) {
            if (common[ci] == p || common[ci] == 1) continue;
            var idx = t.indexOf(common[ci]);
            if (idx != -1) {
              if (idx == 0) t[idx] = '1'; else t.splice(idx, 1);
            } else {
              idx = t.indexOf(common[ci] * -1);
              if (idx != -1) t[idx] = '-1';
            }
          }
        });
      }

      // If all inner terms are negative, factor out -1 to simplify.
      var sign = [];
      // @ts-ignore
      if (!terms_with_p.find(([a, b]) => isNaN(a) || a > 0)) {
        sign = [-1];
        terms_with_p.forEach(x => x[0] *= -1);
      }

      var cf = common.filter(x => x != p && x != 1);
      var hasNumCoeff = cf.length && !isNaN(cf[0]) || sign.length;
      if (terms_with_p.length == 1) e.splice(0, e.length, ...terms_without_p, [...cf, p, terms_with_p[0]]);
      if (terms_with_p.length > 1) e.splice(0, e.length, ...terms_without_p, [...(hasNumCoeff ? [] : [1]), ...cf, ...sign, p, terms_with_p]);
    });
  });
}

// Walk all leaf terms in a nested expression structure, recursing into nested sums.
var walkTerms = (expr, fn) => expr.forEach(term => {
  if (term[term.length - 1] instanceof Array) return walkTerms(term[term.length - 1], fn);
  fn(term);
});

// Phase 3: Shared product detection.
// Find repeated a*b multiplications across all expressions, substitute with combined name.
var findSharedProducts = (expr, prot, prelude) => {
  const prods = {}, protSet = new Set(prot || []);
  expr.forEach(p => p instanceof Array && walkTerms(p, term => {
    const seen = new Set();
    for (var i = 1; i < term.length - 1; ++i)
      for (var j = i + 1; j < term.length; ++j) {
        if (term[i].match(/\(/) || term[j].match(/\(/)) continue;
        if (protSet.has(term[i]) || protSet.has(term[j])) continue;
        const key = term[i] + '*' + term[j];
        if (seen.has(key)) continue;
        seen.add(key);
        prods[key] = (prods[key] ?? 0) + 1;
      }
  }));
  // @ts-ignore
  const prodList = Object.entries(prods).filter(([a, b]) => b > 1).map(([a, b]) => a);
  expr.forEach(p => p instanceof Array && walkTerms(p, term => {
    for (var i = 1; i < term.length - 1; ++i)
      for (var j = i + 1; j < term.length; ++j) {
        const key = term[i] + '*' + term[j];
        if (prods[key] > 1) {
          term.splice(i, 1, key.replace(/[\[\]\*]/g, ''));
          term.splice(j, 1);
        }
      }
  }));
  prelude.push(...prodList.map(x => x.replace(/[\[\]\*]/g, '') + '=' + x));
}

// Phase 4: Substitute extracted sums to reveal further shared structure.
// After extracting sums like t0=b2-c2, remaining terms with b2 can be rewritten
// as t0+c2, causing cancellations that reveal new shared sums (e.g. a-c diffs).
var substituteExtracted = (expr, sumMap) => {
  for (var ci = 0; ci < expr.length; ci++) {
    var e = expr[ci]; if (!(e instanceof Array)) continue;
    var newTerms = [], changed = false;
    for (var t of e) {
      var subIdx = -1;
      for (var fi = 1; fi < t.length; fi++) if (sumMap.has(t[fi])) { subIdx = fi; break; }
      if (subIdx < 0) { newTerms.push(t); continue; }
      changed = true;
      var info = sumMap.get(t[subIdx]);
      var coeff = t[0], rest = [...t.slice(1, subIdx), ...t.slice(subIdx + 1)];
      newTerms.push([coeff, ...[...rest, info.tn].sort()]);
      newTerms.push([coeff, ...[...rest, info.offset].sort()]);
    }
    if (!changed) continue;
    var simplified = 0;
    for (var t of newTerms) simplified = polynomial.add(simplified, [t]);
    if (simplified instanceof Array) e.splice(0, e.length, ...simplified);
    else e.splice(0, e.length);
  }
}

// Phase: detect perfect squares within each component.
// Pattern c·X² + c·Y² ± 2c·X·Y = c·(X±Y)² where X, Y are arbitrary monomials.
// A "square term" has every factor with even multiplicity; root is the half-multiset.
// For each pair of squares with equal coeff c, look for cross term with combined
// factors and coefficient ±2c. Greedy extract.
var findPerfectSquares = (expr, prelude, startCount = 0, tMap = null) => {
  var tCount = startCount;
  for (var ci = 0; ci < expr.length; ci++) {
    var e = expr[ci]; if (!(e instanceof Array)) continue;
    var squares = [], crossMap = new Map();
    for (var ti = 0; ti < e.length; ti++) {
      var t = e[ti];
      if (t.length < 2) continue;
      var factors = t.slice(1).slice().sort();
      var isSquare = factors.length % 2 === 0;
      if (isSquare) for (var i = 0; i < factors.length; i += 2)
        if (factors[i] !== factors[i+1]) { isSquare = false; break; }
      if (isSquare) {
        var root = [];
        for (var i = 0; i < factors.length; i += 2) root.push(factors[i]);
        squares.push({ idx: ti, coeff: t[0], root, key: root.join(',') });
      } else {
        var key = factors.join(',');
        if (!crossMap.has(key)) crossMap.set(key, []);
        crossMap.get(key).push({ idx: ti, coeff: t[0] });
      }
    }
    if (!squares.length || !crossMap.size) continue;
    var used = new Set(), newTerms = [];
    // Larger roots first so we extract bigger structures preferentially.
    var sqOrder = squares.slice().sort((a,b) => b.root.length - a.root.length || (a.key < b.key ? -1 : 1));
    for (var i = 0; i < sqOrder.length; i++) {
      var si = sqOrder[i]; if (used.has(si.idx)) continue;
      for (var j = i + 1; j < sqOrder.length; j++) {
        var sj = sqOrder[j]; if (used.has(sj.idx)) continue;
        if (si.coeff !== sj.coeff || si.coeff === 0) continue;
        if (si.key === sj.key) continue;
        var crossKey = [...si.root, ...sj.root].sort().join(',');
        var crosses = crossMap.get(crossKey); if (!crosses) continue;
        var match = null;
        for (var k = 0; k < crosses.length; k++) {
          if (used.has(crosses[k].idx)) continue;
          if (crosses[k].coeff === 2 * si.coeff || crosses[k].coeff === -2 * si.coeff) { match = crosses[k]; break; }
        }
        if (!match) continue;
        var s = match.coeff / (2 * si.coeff);
        var tn = 't' + tCount++;
        var sumPoly = [[1, ...si.root], [s, ...sj.root]];
        sumPoly.sort((a,b) => polynomial.compare(a, b));
        prelude.push(tn + '=' + polynomial.format(sumPoly));
        if (tMap) tMap.set(tn, sumPoly);
        used.add(si.idx); used.add(sj.idx); used.add(match.idx);
        newTerms.push([si.coeff, tn, tn]);
        break;
      }
    }
    if (!used.size) continue;
    var remaining = e.filter((_, i) => !used.has(i));
    e.splice(0, e.length, ...remaining, ...newTerms);
  }
  return tCount;
}

// Phase: triangle folding (second-order perfect squares).
// After findPerfectSquares produces squared t-vars [c, tn, tn], look for triangles
// (i, j, k) with three cross monomial-sets matching ±2c*(t_i*t_j), ±2c*(t_i*t_k),
// ±2c*(t_j*t_k) where the sign product is +1. Fold into c*(s_i*t_i + s_j*t_j + s_k*t_k)².
var findTriangleFolds = (expr, prelude, tMap, startCount = 0, uMap = null) => {
  if (!tMap || !tMap.size) return startCount;
  var uCount = startCount;
  for (var ci = 0; ci < expr.length; ci++) {
    var e = expr[ci]; if (!(e instanceof Array)) continue;
    // Collect t-var squares present in e.
    var squares = [];
    for (var ti = 0; ti < e.length; ti++) {
      var t = e[ti];
      if (t.length === 3 && t[1] === t[2] && tMap.has(t[1])) squares.push({ idx: ti, coeff: t[0], tn: t[1] });
    }
    if (squares.length < 3) continue;
    // Build monomial map for non-square terms (key=sorted var list).
    var monoMap = new Map();
    var squareIdxSet = new Set(squares.map(s => s.idx));
    for (var ti = 0; ti < e.length; ti++) {
      if (squareIdxSet.has(ti)) continue;
      var t = e[ti]; if (t.length < 2) continue;
      var key = t.slice(1).slice().sort().join(',');
      if (!monoMap.has(key)) monoMap.set(key, []);
      monoMap.get(key).push({ idx: ti, coeff: t[0] });
    }
    // For each pair of squares with matching coeff, compute t_i*t_j and look for
    // ±2c * prod in the cross terms. Record edge with sign.
    var edges = []; // {i, j, sign, coeff, claimed}
    for (var i = 0; i < squares.length; i++) {
      for (var j = i + 1; j < squares.length; j++) {
        if (squares[i].coeff !== squares[j].coeff) continue;
        var c = squares[i].coeff;
        var prod = polynomial.mul(tMap.get(squares[i].tn), tMap.get(squares[j].tn));
        if (!(prod instanceof Array) || prod.length === 0) continue;
        for (var sign of [1, -1]) {
          var ok = true, claimed = [];
          for (var pi = 0; pi < prod.length; pi++) {
            var pt = prod[pi];
            var expectedCoeff = sign * 2 * c * pt[0];
            var key = pt.slice(1).join(',');
            var cands = monoMap.get(key); if (!cands) { ok = false; break; }
            var found = null;
            for (var k = 0; k < cands.length; k++) {
              if (claimed.indexOf(cands[k].idx) >= 0) continue;
              if (cands[k].coeff === expectedCoeff) { found = cands[k]; break; }
            }
            if (!found) { ok = false; break; }
            claimed.push(found.idx);
          }
          if (ok) { edges.push({ i, j, sign, coeff: c, claimed }); break; }
        }
      }
    }
    if (edges.length < 3) continue;
    // Index edges by (i,j) -> edge.
    var edgeMap = new Map();
    for (var ed of edges) edgeMap.set(ed.i + ',' + ed.j, ed);
    // Greedily find triangles with consistent signs.
    var usedSquares = new Set(), usedClaimed = new Set(), triangles = [];
    for (var i = 0; i < squares.length; i++) {
      if (usedSquares.has(i)) continue;
      var foundTri = false;
      for (var j = i + 1; j < squares.length && !foundTri; j++) {
        if (usedSquares.has(j)) continue;
        var eij = edgeMap.get(i + ',' + j); if (!eij) continue;
        for (var k = j + 1; k < squares.length && !foundTri; k++) {
          if (usedSquares.has(k)) continue;
          var eik = edgeMap.get(i + ',' + k); if (!eik) continue;
          var ejk = edgeMap.get(j + ',' + k); if (!ejk) continue;
          if (eij.coeff !== eik.coeff || eij.coeff !== ejk.coeff) continue;
          if (eij.sign * eik.sign * ejk.sign !== 1) continue;
          var allIdx = [...eij.claimed, ...eik.claimed, ...ejk.claimed];
          var conflict = false;
          for (var idx of allIdx) if (usedClaimed.has(idx)) { conflict = true; break; }
          if (conflict) continue;
          var si = 1, sj = eij.sign, sk = eik.sign;
          triangles.push({ i, j, k, si, sj, sk, coeff: eij.coeff, claimed: allIdx });
          usedSquares.add(i); usedSquares.add(j); usedSquares.add(k);
          for (var idx of allIdx) usedClaimed.add(idx);
          foundTri = true;
        }
      }
    }
    if (!triangles.length) continue;
    // Apply: build new u-vars, remove consumed squares + cross monomials.
    var indicesToRemove = new Set();
    var newTerms = [];
    for (var tri of triangles) {
      indicesToRemove.add(squares[tri.i].idx);
      indicesToRemove.add(squares[tri.j].idx);
      indicesToRemove.add(squares[tri.k].idx);
      for (var idx of tri.claimed) indicesToRemove.add(idx);
      var un = 'u' + uCount++;
      var sumPoly = [
        [tri.si, squares[tri.i].tn],
        [tri.sj, squares[tri.j].tn],
        [tri.sk, squares[tri.k].tn]
      ];
      sumPoly.sort((a, b) => polynomial.compare(a, b));
      prelude.push(un + '=' + polynomial.format(sumPoly));
      if (uMap) uMap.set(un, sumPoly);
      newTerms.push([tri.coeff, un, un]);
    }
    var remaining = e.filter((_, i) => !indicesToRemove.has(i));
    e.splice(0, e.length, ...remaining, ...newTerms);
  }
  return uCount;
}

// Phase: bilinear-difference factoring.
// After findTriangleFolds yields u-vars (squared sums of t-vars), expand each un
// to its base-variable polynomial. If it has the 6-monomial bilinear-diff shape
// (A-B)(C-D) - (E-B)(G-D), rewrite un's prelude entry to use 4 differences,
// dropping orphaned t-vars. Greedy choice of anchor pair maximizes diff reuse.
var findBilinearDiffs = (expr, prelude, tMap, uMap) => {
  if (!uMap || !uMap.size) return;

  // Recursively expand a polynomial, substituting any var found in tMap.
  var expandT = (poly) => {
    var result = 0;
    for (var term of poly) {
      var prod = [[term[0]]];
      for (var fi = 1; fi < term.length; fi++) {
        var v = term[fi];
        var sub = tMap.has(v) ? tMap.get(v) : [[1, v]];
        prod = polynomial.mul(prod, sub);
      }
      result = polynomial.add(result, prod);
    }
    return result;
  };

  // Trace alternating-sign 6-cycle. Returns [v0..v5] or null.
  var findCycle = (poly) => {
    if (!Array.isArray(poly) || poly.length !== 6) return null;
    for (var t of poly) {
      if (t.length !== 3) return null;
      if (t[0] !== 1 && t[0] !== -1) return null;
      if (t[1] === t[2]) return null;
    }
    var occs = new Map();
    for (var ti = 0; ti < poly.length; ti++) {
      var t = poly[ti], c = t[0], v1 = t[1], v2 = t[2];
      if (!occs.has(v1)) occs.set(v1, []);
      if (!occs.has(v2)) occs.set(v2, []);
      occs.get(v1).push({ sign: c, other: v2, ti });
      occs.get(v2).push({ sign: c, other: v1, ti });
    }
    if (occs.size !== 6) return null;
    for (var [v, list] of occs) {
      if (list.length !== 2) return null;
      if (list[0].sign + list[1].sign !== 0) return null;
    }
    var startVar = poly[0][1];
    var cycle = [startVar], visited = new Set(), current = startVar, expect = 1;
    for (var step = 0; step < 6; step++) {
      var picks = occs.get(current), nxt = null;
      for (var p of picks) {
        if (visited.has(p.ti)) continue;
        if (p.sign === expect) { nxt = p; break; }
      }
      if (!nxt) return null;
      visited.add(nxt.ti);
      if (step < 5) cycle.push(nxt.other);
      else if (nxt.other !== startVar) return null;
      current = nxt.other;
      expect = -expect;
    }
    return cycle;
  };

  // Build factoring info for cycle + anchor index (0,1,2 for pair (i,i+3)).
  var computeFactoring = (cycle, anchorIdx) => {
    var a1 = anchorIdx, a2 = anchorIdx + 3;
    var evenA = (a1 % 2 === 0) ? a1 : a2;
    var oddA = (a1 % 2 === 1) ? a1 : a2;
    var nonA = [];
    for (var p = 0; p < 6; p++) if (p !== a1 && p !== a2) nonA.push(p);
    var diffByPos = {};
    for (var p of nonA) {
      var ap = (p % 2 === 0) ? evenA : oddA;
      diffByPos[p] = { pos: cycle[p], neg: cycle[ap] };
    }
    var edges = [];
    for (var p = 0; p < 6; p++) {
      var q = (p + 1) % 6;
      if ((p in diffByPos) && (q in diffByPos)) {
        edges.push({ pi: p, pj: q, sign: (p % 2 === 0) ? 1 : -1 });
      }
    }
    if (edges.length !== 2) return null;
    var diffs = [], idxOf = {};
    for (var p of nonA) { idxOf[p] = diffs.length; diffs.push(diffByPos[p]); }
    return {
      diffs,
      pairs: edges.map(e => ({ i: idxOf[e.pi], j: idxOf[e.pj], sign: e.sign }))
    };
  };

  // Canonicalize so that the lex-smaller var is on the positive side.
  var canon = (d) => (d.pos < d.neg)
    ? { pos: d.pos, neg: d.neg, sign: 1 }
    : { pos: d.neg, neg: d.pos, sign: -1 };

  var diffNames = new Map();          // canonical "pos|neg" -> name (e.g. "d0")
  var diffOrder = [];                  // insertion order: { key, pos, neg }
  var rewrites = new Map();            // un -> rhs string

  for (var [un, basePoly] of uMap) {
    var expanded = expandT(basePoly);
    var cycle = findCycle(expanded);
    if (!cycle) continue;

    var best = null, bestReuse = -1;
    for (var ai = 0; ai < 3; ai++) {
      var fact = computeFactoring(cycle, ai);
      if (!fact) continue;
      var ck = fact.diffs.map(d => {
        var c = canon(d);
        return { key: c.pos + '|' + c.neg, sign: c.sign, pos: c.pos, neg: c.neg };
      });
      var reuse = 0;
      for (var k of ck) if (diffNames.has(k.key)) reuse++;
      if (reuse > bestReuse) { bestReuse = reuse; best = { fact, ck }; }
    }
    if (!best) continue;

    // Verify by re-expansion.
    var verify = 0;
    for (var pair of best.fact.pairs) {
      var di = best.fact.diffs[pair.i], dj = best.fact.diffs[pair.j];
      var pi = polynomial.add([[1, di.pos]], [[-1, di.neg]]);
      var pj = polynomial.add([[1, dj.pos]], [[-1, dj.neg]]);
      var prod = polynomial.mul(pi, pj);
      if (pair.sign < 0) prod = polynomial.neg(prod);
      verify = polynomial.add(verify, prod);
    }
    var diff = polynomial.add(verify, polynomial.neg(expanded));
    if (diff !== 0) continue;

    // Allocate names for new diffs.
    for (var k of best.ck) {
      if (!diffNames.has(k.key)) {
        var nm = 'd' + diffOrder.length;
        diffNames.set(k.key, nm);
        diffOrder.push({ key: k.key, pos: k.pos, neg: k.neg });
      }
    }

    // Build RHS string.
    var parts = best.fact.pairs.map(pair => {
      var ki = best.ck[pair.i], kj = best.ck[pair.j];
      var s = pair.sign * ki.sign * kj.sign;
      return { sign: s, str: diffNames.get(ki.key) + '*' + diffNames.get(kj.key) };
    });
    parts.sort((a, b) => b.sign - a.sign);
    var rhs = parts.map((p, i) =>
      i === 0 ? (p.sign < 0 ? '-' : '') + p.str
              : (p.sign < 0 ? '-' : '+') + p.str
    ).join('');
    rewrites.set(un, rhs);
  }

  if (!rewrites.size) return;

  // Find first prelude index whose name is a rewritten u-var.
  var firstUIdx = -1;
  var entryRe = /^([a-zA-Z]\w*)=(.+)$/;
  for (var i = 0; i < prelude.length; i++) {
    var m = prelude[i].match(entryRe);
    if (m && rewrites.has(m[1])) { firstUIdx = i; break; }
  }

  // Compute referenced names: walk expr, then propagate through rewritten prelude.
  var referenced = new Set();
  var addRefs = (s) => {
    var ns = s.match(/[a-zA-Z]\w*/g) || [];
    for (var n of ns) referenced.add(n);
  };
  expr.forEach(e => {
    if (e instanceof Array) walkTerms(e, term => {
      for (var fi = 1; fi < term.length; fi++) addRefs(term[fi]);
    });
  });
  for (var i = prelude.length - 1; i >= 0; i--) {
    var m = prelude[i].match(entryRe);
    if (!m) continue;
    var name = m[1];
    if (!referenced.has(name)) continue;
    if (rewrites.has(name)) addRefs(rewrites.get(name));
    else addRefs(m[2]);
  }

  // Rebuild prelude.
  var newPre = [];
  for (var i = 0; i < prelude.length; i++) {
    var entry = prelude[i];
    var m = entry.match(entryRe);
    if (i === firstUIdx) {
      for (var dk of diffOrder) {
        var dn = diffNames.get(dk.key);
        if (referenced.has(dn)) newPre.push(dn + '=' + dk.pos + '-' + dk.neg);
      }
    }
    if (!m) { newPre.push(entry); continue; }
    var name = m[1];
    if (!referenced.has(name)) continue;
    if (rewrites.has(name)) newPre.push(name + '=' + rewrites.get(name));
    else newPre.push(entry);
  }
  prelude.splice(0, prelude.length, ...newPre);
};

// Phase 5: Detect linear dependencies between components.
// If one component equals a linear combination of others (using variables exclusive
// to that component as coefficients), express it as such.
var detectLinearDeps = (expr) => {
  // Normalize (sort) all components for polynomial arithmetic.
  var norm = expr.map(e => e instanceof Array ? e.reduce((acc, t) => polynomial.add(acc || 0, [t]), 0) : e);

  // Find the heaviest component (most total factors).
  var heaviest = -1, maxWeight = 0;
  for (var i = 0; i < norm.length; i++) {
    var n = norm[i]; if (!(n instanceof Array)) continue;
    var w = n.reduce((s, t) => s + t.length, 0);
    if (w > maxWeight) { maxWeight = w; heaviest = i; }
  }
  if (heaviest < 0 || maxWeight <= 6) return null;

  // Find variables exclusive to the heaviest component.
  var otherVars = new Set();
  for (var i = 0; i < norm.length; i++) {
    if (i === heaviest || !(norm[i] instanceof Array)) continue;
    norm[i].forEach(t => { for (var j = 1; j < t.length; j++) otherVars.add(t[j]); });
  }
  var exclusiveVars = new Set();
  norm[heaviest].forEach(t => { for (var j = 1; j < t.length; j++) if (!otherVars.has(t[j])) exclusiveVars.add(t[j]); });
  if (!exclusiveVars.size) return null;

  // Try to express heaviest as linear combination of other components.
  var remainder = norm[heaviest];
  var deps = [], usedComps = new Set();
  for (var cv of exclusiveVars) {
    for (var oi = 0; oi < norm.length; oi++) {
      if (oi === heaviest || usedComps.has(oi) || !(norm[oi] instanceof Array)) continue;
      var prod = polynomial.mul(norm[oi], cv);
      var rPlus = polynomial.add(remainder, prod);
      var rMinus = polynomial.add(remainder, polynomial.neg(prod));
      var curLen = remainder instanceof Array ? remainder.length : (remainder === 0 ? 0 : 1);
      var plusLen = rPlus instanceof Array ? rPlus.length : (rPlus === 0 ? 0 : 1);
      var minusLen = rMinus instanceof Array ? rMinus.length : (rMinus === 0 ? 0 : 1);
      if (plusLen < curLen) { remainder = rPlus; deps.push({cv, comp: oi, sign: 1}); usedComps.add(oi); break; }
      else if (minusLen < curLen) { remainder = rMinus; deps.push({cv, comp: oi, sign: -1}); usedComps.add(oi); break; }
    }
  }
  if (remainder !== 0) return null;
  return { heaviest, deps };
}

// Main CSE entry point.
// @ts-ignore
polynomial.cse = (expr, prot, iso) => {
  if (!(expr instanceof Array)) return expr;
  var prelude = [];
  var isoVars = (iso || []).filter(x => typeof x === 'string');
  var isoNums = (iso || []).filter(x => typeof x !== 'string');

  // Find shared sums across components (before isolation hides them).
  var sumMap = new Map();
  var hasMixed = findSharedSums(expr, isoVars, prelude, 0, sumMap);

  // Substitute extracted sums, find more shared structure, repeat.
  if (hasMixed && sumMap.size) {
    substituteExtracted(expr, sumMap);
    var tVars = [...new Set([...sumMap.values()].map(v => v.tn))];
    var sumMap2 = new Map();
    var r2 = findSharedSums(expr, tVars, prelude, hasMixed, sumMap2);
    if (r2 > hasMixed) hasMixed = r2;
    if (sumMap2.size) substituteExtracted(expr, sumMap2);
  }

  // Detect linear dependencies (before isolation nests things).
  var dep = hasMixed ? detectLinearDeps(expr) : null;

  // Find perfect squares within each component.
  var tMap = new Map();
  var uMap = new Map();
  var nextT = findPerfectSquares(expr, prelude, hasMixed, tMap);
  // Find triangle folds (second-order squared sums).
  findTriangleFolds(expr, prelude, tMap, 0, uMap);
  // Try to express u-vars as bilinear differences.
  findBilinearDiffs(expr, prelude, tMap, uMap);

  // Isolate variables.
  var isoList = hasMixed ? [...isoVars.reverse(), ...isoNums] : [...(prot || []), ...isoVars.reverse(), ...isoNums];
  isolate(expr, isoList);

  // Apply linear dependencies (after isolation).
  if (dep) {
    for (var d of dep.deps) {
      var rn = 'u' + d.comp;
      prelude.push(rn + '=' + polynomial.format(expr[d.comp]));
      expr[d.comp] = [[1, rn]];
    }
    expr[dep.heaviest] = dep.deps.map(d => [-d.sign, d.cv, 'u' + d.comp]);
  }

  // Find shared products.
  findSharedProducts(expr, prot, prelude);

  return [prelude, expr];
}

export default polynomial;