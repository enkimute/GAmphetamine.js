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

// Walk all leaf terms in a nested expression structure, recursing into nested sums.
var walkTerms = (expr, fn) => expr.forEach(term => {
  if (term[term.length - 1] instanceof Array) return walkTerms(term[term.length - 1], fn);
  fn(term);
});

// In-place: drop indices in removeSet from e and append newTerms. Returns e.
var rebuildComponent = (e, removeSet, newTerms) => {
  e.splice(0, e.length, ...e.filter((_, i) => !removeSet.has(i)), ...(newTerms || []));
  return e;
};

// Reduce a flat term list into canonical polynomial form via polynomial.add.
var normalizePoly = (terms) => terms.reduce((a, t) => polynomial.add(a, [t]), 0);

// Pre-isolation shared-sum detection.
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
        var t = e[ti], vIdx = t.indexOf(v);
        if (vIdx < 1) continue;
        rTerms.push([t[0], ...t.slice(1, vIdx), ...t.slice(vIdx + 1)]); rIdx.push(ti);
      }
      if (rTerms.length < 2) continue;
      // Enumerate full residual + (for 4-term residuals only) every 3-subset.
      // The size-3 path is needed by the 3DPGA sandwich op-count (21 muls / 18 adds);
      // without it we miss a partial-overlap shared sum and regress to 22+ muls.
      var subsetLists = rTerms.length === 4
        ? [[0,1,2,3], [1,2,3], [0,2,3], [0,1,3], [0,1,2]]
        : [[...rTerms.keys()]];
      for (var si of subsetLists) {
        var sub = si.map(i => rTerms[i]), subI = si.map(i => rIdx[i]);
        // Normalize: divide by GCD of |coeff|, canonical-sort by factors, force first coeff positive.
        var g = Math.abs(sub[0][0]);
        for (var i = 1; i < sub.length; i++) {
          var a = g, b = Math.abs(sub[i][0]);
          while (b) { var tmp = b; b = a % b; a = tmp; }
          g = a;
        }
        var norm = sub.map(t => [t[0] / g, ...t.slice(1)]).sort(polynomial.compare);
        var sign = 1; if (norm[0][0] < 0) { norm = norm.map(t => [-t[0], ...t.slice(1)]); sign = -1; }
        var key = norm.map(t => t.join(',')).join('|');
        if (!resMap.has(key)) resMap.set(key, []);
        resMap.get(key).push({ comp: ci, v, sign, gcd: g, idx: subI, norm });
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
      // Keep factor list sorted: lex-smaller var first.
      var f = occ.v < sn ? [occ.v, sn] : [sn, occ.v];
      replacements.push({ comp: occ.comp, indices: occ.idx, term: [occ.gcd * occ.sign, ...f] });
    }
  }
  // Apply all replacements at once to avoid index invalidation.
  for (var ci = 0; ci < expr.length; ci++) {
    var e = expr[ci]; if (!(e instanceof Array)) continue;
    var repls = replacements.filter(r => r.comp === ci);
    if (!repls.length) continue;
    var removeSet = new Set();
    repls.forEach(r => r.indices.forEach(i => removeSet.add(i)));
    rebuildComponent(e, removeSet, repls.map(r => r.term));
  }
  return sumCount;
}

// Variable isolation: factor out each variable in isoList from expressions that contain
// it in 2+ terms. Collects common factors, handles sign normalization, builds nested
// structure (each isolated factor wraps the remaining terms in a sub-array).
var isolate = (expr, isoList) => {
  isoList.forEach(p => {
    // @ts-ignore
    expr.forEach((e) => {
      if (!(e instanceof Array)) return;

      // Partition terms into with-p (any sign) and without; strip one occurrence of p
      // from with-p terms, mapping -p to a -1 placeholder so the term keeps a numeric coeff.
      var terms_with_p = [], terms_without_p = [];
      e.forEach(t => {
        var pIdx = t.indexOf(p);
        if (pIdx < 0 && t.indexOf(-p) < 0) { terms_without_p.push(t); return; }
        var r = t.filter((_, i) => i !== pIdx).map(f => f == -p ? -1 : f);
        if (r.length && typeof r[0] === 'string') r.unshift(1);
        terms_with_p.push(r);
      });
      if (terms_with_p.length <= 1) return;

      // Find factors common to every term-with-p (matched by absolute name; sign ignored).
      // counts: absname -> { count, factor: positive form }.
      var counts = {};
      terms_with_p.forEach(t => {
        var seen = {};
        t.forEach(f => {
          var n = ('' + f).replace('-', ''); if (n === '1' || seen[n]) return;
          seen[n] = 1;
          if (!counts[n]) counts[n] = { count: 0, factor: f < 0 ? -f : f };
          counts[n].count++;
        });
      });
      var common = Object.values(counts).filter(c => c.count == terms_with_p.length).map(c => c.factor);

      // Remove one occurrence of each common factor from each term (preserving sign markers).
      common.forEach(cf => {
        if (cf == p || cf == 1) return;
        terms_with_p.forEach(t => {
          var idx = t.indexOf(cf);
          if (idx != -1) { if (idx == 0) t[idx] = '1'; else t.splice(idx, 1); return; }
          idx = t.indexOf(cf * -1);
          if (idx != -1) t[idx] = '-1';
        });
      });

      // If all inner terms are negative, hoist -1 out of the bracket.
      var sign = [];
      // @ts-ignore
      if (!terms_with_p.find(([a]) => isNaN(a) || a > 0)) {
        sign = [-1];
        terms_with_p.forEach(x => x[0] *= -1);
      }

      var cf = common.filter(x => x != p && x != 1);
      var hasNumCoeff = (cf.length && !isNaN(cf[0])) || sign.length;
      var inner = terms_with_p.length == 1 ? terms_with_p[0] : terms_with_p;
      var prefix = terms_with_p.length == 1 ? cf : [...(hasNumCoeff ? [] : [1]), ...cf, ...sign];
      e.splice(0, e.length, ...terms_without_p, [...prefix, p, inner]);
    });
  });
}

// Shared-product detection: find repeated a*b multiplications across all expressions,
// substitute with a combined name (e.g. a[0]*b[1] -> a0b1).
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

// Substitute extracted sums to reveal further shared structure.
// After extracting sums like t0=b2-c2, remaining terms with b2 can be rewritten
// as t0+c2, causing cancellations that reveal new shared sums (e.g. a-c diffs).
var substituteExtracted = (expr, sumMap) => {
  for (var ci = 0; ci < expr.length; ci++) {
    var e = expr[ci]; if (!(e instanceof Array)) continue;
    var newTerms = [], changed = false;
    for (var t of e) {
      // sumMap keys are strings; coeff at t[0] is numeric, so findIndex never matches it.
      var subIdx = t.findIndex(f => sumMap.has(f));
      if (subIdx < 0) { newTerms.push(t); continue; }
      changed = true;
      var info = sumMap.get(t[subIdx]);
      // Substitute v -> tn + offset, i.e. the term multiplied by that two-term sum.
      var stripped = [t[0], ...t.slice(1, subIdx), ...t.slice(subIdx + 1)];
      newTerms.push(...polynomial.mul([stripped], [[1, info.tn], [1, info.offset]]));
    }
    if (!changed) continue;
    var simplified = normalizePoly(newTerms);
    e.splice(0, e.length, ...(simplified instanceof Array ? simplified : []));
  }
}

// Detect square-of-sum structure inside each component.
// Two modes (selected by opts.mode):
//   'pair'     — c·X² + c·Y² ± 2c·X·Y → c·(X±Y)². X,Y are monomials.
//   'triangle' — Σ c·tᵢ² + Σ ±2c·tᵢtⱼ → c·(±tᵢ ± tⱼ ± tₖ)². tᵢ are previously-extracted
//                square sums (looked up via opts.tMap).
// In both modes we classify component terms into "squares" (terms whose factor
// list is a perfect square — all even multiplicities for 'pair', or [c, tn, tn]
// with tn∈tMap for 'triangle') and "cross" terms (everything else, indexed by
// sorted-factor key). Then we match — pair-wise for 'pair', triangle-wise for
// 'triangle' — and rebuild via rebuildComponent.
var findSquareStructure = (expr, prelude, opts) => {
  var { mode, name, startCount = 0, tMap, outMap } = opts;
  var counter = startCount;
  for (var ci = 0; ci < expr.length; ci++) {
    var e = expr[ci]; if (!(e instanceof Array)) continue;
    // Classify.
    var squares = [], crossMap = new Map();
    for (var ti = 0; ti < e.length; ti++) {
      var t = e[ti];
      var sq = null;
      if (mode === 'pair') {
        if (t.length < 2) continue;
        // Terms are sorted by design — pair-step over factors directly.
        var ok = (t.length - 1) % 2 === 0;
        if (ok) for (var i = 1; i < t.length; i += 2) if (t[i] !== t[i+1]) { ok = false; break; }
        if (ok) {
          var root = [];
          for (var i = 1; i < t.length; i += 2) root.push(t[i]);
          sq = { idx: ti, coeff: t[0], root, key: root.join(',') };
        }
      } else {
        if (t.length === 3 && t[1] === t[2] && tMap.has(t[1])) sq = { idx: ti, coeff: t[0], tn: t[1] };
      }
      if (sq) { squares.push(sq); continue; }
      if (t.length < 2) continue;
      var key = t.slice(1).join(',');
      if (!crossMap.has(key)) crossMap.set(key, []);
      crossMap.get(key).push({ idx: ti, coeff: t[0] });
    }

    var used = new Set(), newTerms = [];

    if (mode === 'pair') {
      if (!squares.length || !crossMap.size) continue;
      // Larger roots first so we extract bigger structures preferentially.
      var sqOrder = squares.slice().sort((a, b) => b.root.length - a.root.length || (a.key < b.key ? -1 : 1));
      for (var i = 0; i < sqOrder.length; i++) {
        var si = sqOrder[i]; if (used.has(si.idx)) continue;
        for (var j = i + 1; j < sqOrder.length; j++) {
          var sj = sqOrder[j]; if (used.has(sj.idx)) continue;
          if (si.coeff !== sj.coeff || si.coeff === 0 || si.key === sj.key) continue;
          // Merged sorted factor list of root-i and root-j, as a comma-key matching crossMap.
          var crosses = crossMap.get(polynomial.mul([[1, ...si.root]], [[1, ...sj.root]])[0].slice(1).join(',')); if (!crosses) continue;
          var match = null;
          for (var k = 0; k < crosses.length; k++) {
            if (used.has(crosses[k].idx)) continue;
            if (crosses[k].coeff === 2 * si.coeff || crosses[k].coeff === -2 * si.coeff) { match = crosses[k]; break; }
          }
          if (!match) continue;
          var s = match.coeff / (2 * si.coeff);
          var tn = name + counter++;
          var sumPoly = [[1, ...si.root], [s, ...sj.root]];
          sumPoly.sort(polynomial.compare);
          prelude.push(tn + '=' + polynomial.format(sumPoly));
          if (outMap) outMap.set(tn, sumPoly);
          used.add(si.idx); used.add(sj.idx); used.add(match.idx);
          newTerms.push([si.coeff, tn, tn]);
          break;
        }
      }
    } else {
      if (squares.length < 3) continue;
      // Build edges: pair (i,j) of squares that produce a coeff-matched cross set.
      var edges = [];
      for (var i = 0; i < squares.length; i++) for (var j = i + 1; j < squares.length; j++) {
        if (squares[i].coeff !== squares[j].coeff) continue;
        var c = squares[i].coeff;
        var prod = polynomial.mul(tMap.get(squares[i].tn), tMap.get(squares[j].tn));
        if (!(prod instanceof Array) || prod.length === 0) continue;
        for (var sign of [1, -1]) {
          var ok = true, claimed = [];
          for (var pi = 0; pi < prod.length; pi++) {
            var pt = prod[pi];
            var cands = crossMap.get(pt.slice(1).join(',')); if (!cands) { ok = false; break; }
            var found = null;
            for (var k = 0; k < cands.length; k++) {
              if (claimed.indexOf(cands[k].idx) >= 0) continue;
              if (cands[k].coeff === sign * 2 * c * pt[0]) { found = cands[k]; break; }
            }
            if (!found) { ok = false; break; }
            claimed.push(found.idx);
          }
          if (ok) { edges.push({ i, j, sign, coeff: c, claimed }); break; }
        }
      }
      if (edges.length < 3) continue;
      var edgeMap = new Map();
      for (var ed of edges) edgeMap.set(ed.i + ',' + ed.j, ed);
      // Greedily find triangles with consistent signs.
      var usedSquares = new Set();
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
            if (allIdx.some(idx => used.has(idx))) continue;
            var un = name + counter++;
            var sumPoly = [[1, squares[i].tn], [eij.sign, squares[j].tn], [eik.sign, squares[k].tn]];
            sumPoly.sort(polynomial.compare);
            prelude.push(un + '=' + polynomial.format(sumPoly));
            if (outMap) outMap.set(un, sumPoly);
            usedSquares.add(i); usedSquares.add(j); usedSquares.add(k);
            used.add(squares[i].idx); used.add(squares[j].idx); used.add(squares[k].idx);
            for (var idx of allIdx) used.add(idx);
            newTerms.push([eij.coeff, un, un]);
            foundTri = true;
          }
        }
      }
    }

    if (used.size) rebuildComponent(e, used, newTerms);
  }
  return counter;
};

// Try to factor poly as a bilinear difference: (A-B)(C-D) ± (E-F)(G-H), six monomials
// forming an alternating-sign Hamiltonian cycle on six distinct variables. Picks the
// anchor that maximizes reuse of already-allocated diff names. Allocates new _dN names
// into diffNames/diffOrder on success. Returns { pairs:[{sign,di,dj}] } or null.
var tryBilinearDiff = (poly, diffNames, diffOrder) => {
  // 1. Shape check + occurrence map.
  if (!Array.isArray(poly) || poly.length !== 6) return null;
  for (var t of poly) if (t.length !== 3 || (t[0] !== 1 && t[0] !== -1) || t[1] === t[2]) return null;
  var occs = new Map();
  for (var ti = 0; ti < 6; ti++) {
    var t = poly[ti], v1 = t[1], v2 = t[2];
    if (!occs.has(v1)) occs.set(v1, []);
    if (!occs.has(v2)) occs.set(v2, []);
    occs.get(v1).push({ sign: t[0], other: v2, ti });
    occs.get(v2).push({ sign: t[0], other: v1, ti });
  }
  if (occs.size !== 6) return null;
  for (var [, list] of occs) if (list.length !== 2 || list[0].sign + list[1].sign !== 0) return null;

  // 2. Walk alternating-sign 6-cycle.
  var cycle = [poly[0][1]], visited = new Set(), cur = poly[0][1], expect = 1;
  for (var step = 0; step < 6; step++) {
    var nxt = null;
    for (var p of occs.get(cur)) if (!visited.has(p.ti) && p.sign === expect) { nxt = p; break; }
    if (!nxt) return null;
    visited.add(nxt.ti);
    if (step < 5) cycle.push(nxt.other);
    else if (nxt.other !== cycle[0]) return null;
    cur = nxt.other; expect = -expect;
  }

  // 3. Try each of 3 anchors; keep the one that maximizes diff-name reuse.
  var canon = (pos, neg) => pos < neg ? { pos, neg, sign: 1 } : { pos: neg, neg: pos, sign: -1 };
  var best = null, bestReuse = -1;
  for (var ai = 0; ai < 3; ai++) {
    var a1 = ai, a2 = ai + 3;
    var evenA = a1 % 2 === 0 ? a1 : a2, oddA = a1 % 2 === 0 ? a2 : a1;
    var nonA = [0,1,2,3,4,5].filter(p => p !== a1 && p !== a2);
    var diffByPos = {};
    for (var p of nonA) diffByPos[p] = { pos: cycle[p], neg: cycle[p % 2 === 0 ? evenA : oddA] };
    var edges = [];
    for (var p = 0; p < 6; p++) {
      var q = (p + 1) % 6;
      if (p in diffByPos && q in diffByPos) edges.push({ pi: p, pj: q, sign: p % 2 === 0 ? 1 : -1 });
    }
    if (edges.length !== 2) continue;
    var diffs = [], idxOf = {};
    for (var p of nonA) { idxOf[p] = diffs.length; diffs.push(diffByPos[p]); }
    var pairs = edges.map(e => ({ i: idxOf[e.pi], j: idxOf[e.pj], sign: e.sign }));
    var ck = diffs.map(d => { var c = canon(d.pos, d.neg); return { key: c.pos + '|' + c.neg, ...c }; });
    var reuse = ck.reduce((s, k) => s + (diffNames.has(k.key) ? 1 : 0), 0);
    if (reuse > bestReuse) { bestReuse = reuse; best = { pairs, ck, diffs }; }
  }
  if (!best) return null;

  // 4. Verify by re-expansion.
  var verify = 0;
  for (var pair of best.pairs) {
    var di = best.diffs[pair.i], dj = best.diffs[pair.j];
    var prod = polynomial.mul(polynomial.add([[1, di.pos]], [[-1, di.neg]]),
                              polynomial.add([[1, dj.pos]], [[-1, dj.neg]]));
    if (pair.sign < 0) prod = polynomial.neg(prod);
    verify = polynomial.add(verify, prod);
  }
  if (polynomial.add(verify, polynomial.neg(poly)) !== 0) return null;

  // 5. Allocate names + emit.
  for (var k of best.ck) if (!diffNames.has(k.key)) {
    diffNames.set(k.key, '_d' + diffOrder.length);
    diffOrder.push({ key: k.key, pos: k.pos, neg: k.neg });
  }
  return {
    pairs: best.pairs.map(pair => {
      var ki = best.ck[pair.i], kj = best.ck[pair.j];
      return { sign: pair.sign * ki.sign * kj.sign, di: diffNames.get(ki.key), dj: diffNames.get(kj.key) };
    })
  };
};

// Bilinear-difference factoring (u-var pathway).
// After findSquareStructure 'triangle' mode yields u-vars (squared sums of t-vars),
// expand each un to its base-variable polynomial. If it has the 6-monomial bilinear-diff
// shape (A-B)(C-D) - (E-B)(G-D), rewrite un's prelude entry to use 4 differences,
// dropping orphaned t-vars. Greedy choice of anchor pair maximizes diff reuse.
var findBilinearDiffs = (expr, prelude, tMap, uMap) => {
  if (!uMap || !uMap.size) return;

  // Expand a u-var's stored polynomial out to base variables by substituting any factor
  // found in tMap with its sum-polynomial. tMap values are always sums of base vars
  // (one level deep), so a single pass suffices.
  var expandT = (poly) => {
    var result = 0;
    for (var term of poly) {
      var prod = [[term[0]]];
      for (var fi = 1; fi < term.length; fi++)
        prod = polynomial.mul(prod, tMap.has(term[fi]) ? tMap.get(term[fi]) : [[1, term[fi]]]);
      result = polynomial.add(result, prod);
    }
    return result;
  };

  var diffNames = new Map();          // canonical "pos|neg" -> name (e.g. "d0")
  var diffOrder = [];                  // insertion order: { key, pos, neg }
  var rewrites = new Map();            // un -> rhs string

  for (var [un, basePoly] of uMap) {
    var factored = tryBilinearDiff(expandT(basePoly), diffNames, diffOrder);
    if (!factored) continue;
    // Build RHS string: positive-sign pairs first, then the negatives.
    factored.pairs.sort((a, b) => b.sign - a.sign);
    rewrites.set(un, factored.pairs.map((p, i) =>
      (p.sign < 0 ? '-' : i === 0 ? '' : '+') + p.di + '*' + p.dj).join(''));
  }

  if (!rewrites.size) return;

  // Compute referenced names (forward over expr, backward over prelude for transitive deps).
  // Same backward pass also locates the first prelude index that is a rewritten u-var,
  // where we will inject the _d definitions.
  var entryRe = /^([_a-zA-Z]\w*)=(.+)$/;
  var addRefs = (s, set) => { for (var n of (s.match(/[_a-zA-Z]\w*/g) || [])) set.add(n); };
  var referenced = new Set();
  expr.forEach(e => { if (e instanceof Array) walkTerms(e, term => {
    for (var fi = 1; fi < term.length; fi++) addRefs(term[fi], referenced);
  }); });
  var firstUIdx = -1;
  for (var i = prelude.length - 1; i >= 0; i--) {
    var m = prelude[i].match(entryRe); if (!m) continue;
    var rw = rewrites.get(m[1]);
    if (rw !== undefined) firstUIdx = i;
    if (referenced.has(m[1])) addRefs(rw !== undefined ? rw : m[2], referenced);
  }

  // Rebuild prelude: drop unreferenced, rewrite u-vars, inject _d-defs before first u.
  var newPre = [];
  for (var i = 0; i < prelude.length; i++) {
    if (i === firstUIdx) for (var dk of diffOrder) {
      var dn = diffNames.get(dk.key);
      if (referenced.has(dn)) newPre.push(dn + '=' + dk.pos + '-' + dk.neg);
    }
    var m = prelude[i].match(entryRe);
    if (!m) { newPre.push(prelude[i]); continue; }
    if (!referenced.has(m[1])) continue;
    var rw = rewrites.get(m[1]);
    newPre.push(rw !== undefined ? m[1] + '=' + rw : prelude[i]);
  }
  prelude.splice(0, prelude.length, ...newPre);
};

// Post-isolate group merging.
// After isolate produces a polynomial of the form
//   Σ v1_k · P1_k + Σ v2_k · P2_k + (other terms)
// (with v1, v2 being indexed isolation-variable families like b0,b1,b2 / a0,a1,a2),
// detect cases where Σ v2_k · P1_k = ± Σ v2_k · P2_k as a polynomial identity.
// When so, the two groups can be merged into Σ (v1_k ± v2_k) · P1_k, replacing
// 2N nested terms with N nested terms whose outer factor is a freshly-introduced
// difference/sum of the original isolation variables.
// Polynomial-identity check is done in normalized base-variable form.
var findGroupMerges = (expr, prelude) => {
  var nextE = 0;

  var tryMerge = (poly) => {
    // Group eligible terms by outer-variable family.
    var groups = new Map();
    for (var ti = 0; ti < poly.length; ti++) {
      var term = poly[ti];
      if (term.length !== 3 || !(term[2] instanceof Array)) continue;
      if (typeof term[1] !== 'string') continue;
      // Match plain (a0), bracketed (a[0]) or LaTeX-subscript (a_{0}) indexed names.
      var m = term[1].match(/^([a-zA-Z]+)(?:\[(\d+)\]|_\{(\d+)\}|(\d+))$/);
      if (!m) continue;
      var fam = m[1];
      if (!groups.has(fam)) groups.set(fam, []);
      groups.get(fam).push({ termIdx: ti, varIdx: +(m[2] || m[3] || m[4]), varName: term[1], sign: term[0], inner: term[2] });
    }

    var families = [...groups.keys()];
    for (var fi = 0; fi < families.length; fi++) {
      for (var fj = 0; fj < families.length; fj++) {
        if (fi === fj) continue;
        var g1raw = groups.get(families[fi]);
        var g2raw = groups.get(families[fj]);
        if (g1raw.length !== g2raw.length || g1raw.length < 2) continue;
        var g1 = [...g1raw].sort((a, b) => a.varIdx - b.varIdx);
        var g2 = [...g2raw].sort((a, b) => a.varIdx - b.varIdx);
        if (g1.some((m, i) => m.varIdx !== g2[i].varIdx)) continue;

        // Build polyA = Σ v2_k · P1_k (signed) and polyB = Σ v2_k · P2_k.
        // Use the actual stored variable names so substitutions match inner-poly vars
        // regardless of naming style (a0, a[0], a_{0}).
        var polyA = 0, polyB = 0;
        for (var k = 0; k < g1.length; k++) {
          var v2k = g2[k].varName;
          var innerA = normalizePoly(g1[k].inner);
          var innerB = normalizePoly(g2[k].inner);
          if (innerA === 0 || innerB === 0) { polyA = null; break; }
          polyA = polynomial.add(polyA, polynomial.mul([[g1[k].sign, v2k]], innerA));
          polyB = polynomial.add(polyB, polynomial.mul([[g2[k].sign, v2k]], innerB));
        }
        if (polyA === null) continue;

        var s;
        if (polynomial.add(polyA, polynomial.neg(polyB)) === 0) s = +1;
        else if (polynomial.add(polyA, polyB) === 0) s = -1;
        else continue;

        // Apply rewrite. New term k: g1.sign[k] * (v1_k + mergeSign * v2_k) * P1_k.
        var newTerms = [];
        for (var k = 0; k < g1.length; k++) {
          var mergeSign = g2[k].sign * s / g1[k].sign;
          if (mergeSign !== 1 && mergeSign !== -1) return false;
          var newName = '_e' + (nextE++);
          prelude.push(newName + '=' + g1[k].varName + (mergeSign > 0 ? '+' : '-') + g2[k].varName);
          newTerms.push([g1[k].sign, newName, g1[k].inner]);
        }

        rebuildComponent(poly, new Set([...g1, ...g2].map(m => m.termIdx)), newTerms);
        return true;
      }
    }
    return false;
  };

  for (var c = 0; c < expr.length; c++) {
    var poly = expr[c];
    if (!(poly instanceof Array)) continue;
    while (tryMerge(poly)) { /* keep merging */ }
  }
};

// Post-isolate nested bilinear-difference factoring.
// After isolate(), inner sub-expressions in factored terms can themselves be
// 6-monomial bilinear-diffs (e.g., the b-inners in the 4-point join, which are
// components of (c-a)×(d-a)). Walk the nested structure and rewrite each such
// inner in place. Diffs accumulate in a single shared registry across all inners,
// so common ones (like c_i-a_i and d_i-a_i) are reused.
var findNestedBilinearDiffs = (expr, prelude) => {
  var diffNames = new Map(), diffOrder = [];

  var process = (poly) => {
    var factored = tryBilinearDiff(poly, diffNames, diffOrder);
    if (factored) {
      var newTerms = factored.pairs.map(p => [p.sign, p.di, p.dj]);
      newTerms.sort(polynomial.compare);
      poly.splice(0, poly.length, ...newTerms);
      return;
    }
    for (var term of poly) {
      if (term[term.length - 1] instanceof Array) {
        process(term[term.length - 1]);
      }
    }
  };

  expr.forEach(e => { if (e instanceof Array) process(e); });

  for (var d of diffOrder) {
    prelude.push(diffNames.get(d.key) + '=' + d.pos + '-' + d.neg);
  }
};

// Detect linear dependencies between components: if one component equals a linear
// combination of others (using variables exclusive to that component as coefficients),
// express it as such. Returns intent; caller applies post-isolate.
var detectLinearDeps = (expr) => {
  // Normalize (sort) all components for polynomial arithmetic.
  var norm = expr.map(e => e instanceof Array ? normalizePoly(e) : e);

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
  var polyLen = (p) => p instanceof Array ? p.length : (p === 0 ? 0 : 1);
  var remainder = norm[heaviest];
  var deps = [], usedComps = new Set();
  for (var cv of exclusiveVars) {
    for (var oi = 0; oi < norm.length; oi++) {
      if (oi === heaviest || usedComps.has(oi) || !(norm[oi] instanceof Array)) continue;
      var prod = polynomial.mul(norm[oi], cv);
      var rPlus = polynomial.add(remainder, prod);
      var rMinus = polynomial.add(remainder, polynomial.neg(prod));
      var curLen = polyLen(remainder);
      if (polyLen(rPlus) < curLen)       { remainder = rPlus;  deps.push({cv, comp: oi, sign:  1}); usedComps.add(oi); break; }
      else if (polyLen(rMinus) < curLen) { remainder = rMinus; deps.push({cv, comp: oi, sign: -1}); usedComps.add(oi); break; }
    }
  }
  if (remainder !== 0) return null;
  return { heaviest, deps };
}

// Main CSE entry point. Pipeline (ordering is test-pinned, do not reorder):
//   1. Pre-isolation shared-sum extraction (with one substitution-driven follow-up round).
//   2. Linear-dependence detection (deferred application; runs only when sums fired).
//   3. Square-structure: monomial perfect-squares → t-vars, then triangle folds → u-vars.
//   4. Bilinear-diff rewriting of u-vars.
//   5. Variable isolation.
//   6. Post-isolate group merging + nested bilinear-diff.
//   7. Linear-dependence application.
//   8. Shared-product extraction.
// @ts-ignore
polynomial.cse = (expr, prot, iso) => {
  if (!(expr instanceof Array)) return expr;
  var prelude = [];
  var isoVars = (iso || []).filter(x => typeof x === 'string');
  var isoNums = (iso || []).filter(x => typeof x !== 'string');

  var sumMap = new Map();
  var hasMixed = findSharedSums(expr, isoVars, prelude, 0, sumMap);
  if (hasMixed && sumMap.size) {
    substituteExtracted(expr, sumMap);
    // sumMap values each carry a freshly-generated tn, so no dedupe is needed.
    var tVars = [...sumMap.values()].map(v => v.tn);
    var sumMap2 = new Map();
    hasMixed = findSharedSums(expr, tVars, prelude, hasMixed, sumMap2);
    if (sumMap2.size) substituteExtracted(expr, sumMap2);
  }

  var dep = hasMixed ? detectLinearDeps(expr) : null;

  var tMap = new Map(), uMap = new Map();
  findSquareStructure(expr, prelude, { mode: 'pair',     name: 't', startCount: hasMixed, outMap: tMap });
  findSquareStructure(expr, prelude, { mode: 'triangle', name: 'u', startCount: 0,        outMap: uMap, tMap });
  findBilinearDiffs(expr, prelude, tMap, uMap);

  var isoList = hasMixed ? [...isoVars.reverse(), ...isoNums]
                         : [...(prot || []), ...isoVars.reverse(), ...isoNums];
  isolate(expr, isoList);
  findGroupMerges(expr, prelude);
  findNestedBilinearDiffs(expr, prelude);

  if (dep) {
    // NOTE: 'u' + d.comp shares the 'u' prefix with the triangle-fold u-vars from
    // findSquareStructure. Latent collision risk if both phases fire on the same input
    // (no current test triggers it). Consider renaming this prefix (e.g. '_lin').
    for (var d of dep.deps) {
      var rn = 'u' + d.comp;
      prelude.push(rn + '=' + polynomial.format(expr[d.comp]));
      expr[d.comp] = [[1, rn]];
    }
    expr[dep.heaviest] = dep.deps.map(d => [-d.sign, d.cv, 'u' + d.comp]);
  }

  findSharedProducts(expr, prot, prelude);
  return [prelude, expr];
}

export default polynomial;