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
         (coeff[0] === '-')?[[-1,coeff.slice(1)]]:     // support '-x' as name.
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

polynomial.add = function(a,b) {
  // If either input is zero, return the other.
  if (a===0) return b; if (b===0) return a;
  // Make sure both inputs are polynomials.
  a = polynomial(a); b = polynomial(b);
  // start with two indices and empty result.
  var ai=0, bi=0, al=a.length, bl=b.length, res=[], ea=a[0], eb=b[0];
  // Now consume from both lists in order. (this keeps the result sorted)
  while (true) {
    // Grab the two elements under consideration.
    var diff = polynomial.compare(ea, eb);
    // See which one is smallest.
         if (diff < 0) { res.push(ea); ++ai; ea=a[ai]; } 
    else if (diff > 0) { res.push(eb); ++bi; eb=b[bi]; } 
    // If they are the same, add their scalar factors, store only one and continue
    else { ea = ea.slice(); ea[0] += eb[0]; if (ea[0]!==0) res.push(ea); ++ai; ++bi; ea=a[ai]; eb=b[bi]; }
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

polynomial.format = (...args)=>args.map(a=>a.join?a.map(x=>x.length==1?x:x.filter(x=>x!==1).map(x=>x.join?'('+polynomial.format(x)+')':x).join('*')).join('+').replace(/\+\-/g,'-').replace(/\b1\*/g,''):a).join('')

// Common Subexpression Elimination. We eliminate re-used multiplications
// by repeating the extraction of the most common pair. Additionally, we
// allow factors in protect to be excluded and those in isolate to be
// moved outside brackets in the final expression.

/** @type {function(array, any=, array=): array} */
polynomial.cse = (expr, protect=[], isolate=[...protect,2,0.5,"t"])=>{

  // All will contain all pairs with their counts, pObj is a searchable
  // version of the protext array, and e consider only non-zero
  // expressions.
  var all  = [];
  var pObj = Object.fromEntries((protect||[]).map(x=>[x,1])); 
  var expr_nonzero = expr.filter(e=>e&&e.map);
  
  // Repeat replacing the most occuring combination.
  if (protect !== false) for (var count=0; count<200; count++) {
    var se = {};
  
    // filter out protected factors to make search faster.
    var fexpr = expr_nonzero.map(sum=>sum.map(product=>product.filter(factor=>!pObj[factor] && isNaN(factor) && typeof factor != 'bigint')));

    // Collect and count all pairs.
    fexpr.forEach(sum=>{
      sum.forEach&&sum.forEach(product=>{
        for (var i=0, il=product.length-1; i<il; ++i) for (var j=i+1, jl=il+1; j<jl; ++j) {
          var name = (product[i]+'*'+product[j]);
          if (name.indexOf('**')!=-1) continue;
          se[name] = (se[name]||0)+1;
        }
      });
    });
    
    // Find one with most occurences.
    var [sname,scount] = Object.entries(se).sort((a,b)=>b[1]-a[1])[0]||[0,0];
    if (scount <= 1) break;
    all.push([sname.replace(/[\[\]*]/g,''),sname]);
    
    // Now substitute this combination in all expressions.
    expr.forEach(sum=>{
      sum.forEach&&sum.forEach(product=>{
        for (var i=1; i<product.length-1; ++i) for (var j=i+1; j<product.length; ++j) {
          var name = (product[i]+'*'+product[j]);
          if (name == sname) {
            product.splice(j,1);
            product.splice(i,1,name.replace(/[\[\]*]/g,''));
            return; // skips to next term.
          }
        }
      });
    });
  }

  // Isolate
  isolate.forEach(p=>{
    expr.forEach((e,ei,ea)=>{
      if (!(e instanceof Array)) return;
    
      // split the terms in those with and without factor to isolate. 
      var terms_with_p    = e.filter(product=>~product.indexOf(p)||~product.indexOf(-p)).map(t=>t.filter(f=>f!=p).map(f=>f==-p?-1:f));
      var terms_without_p = e.filter(product=>!~product.indexOf(p)&&!~product.indexOf(-p));
      
      // Count how many common factors there are and collect them
      var common = {}, commonE = {};
      if (terms_with_p.length == 1) return;
      terms_with_p.forEach(t=>{
        t.forEach(f=>{
          var n = (''+f).replace('-',''); if (n==='1') return;
          common['_'+n] = (common['_'+n]||0)+1;
          commonE['_'+n] = f<0?-f:f;
        });
      })
      common = Object.entries(common).filter(([n,c])=>c==terms_with_p.length).map(([n,c])=>commonE[n]);

      // If there are common factors, do the substitution.
      if (common.length) {
        terms_with_p.forEach((t,ti,ta)=>{
          var idx = t.indexOf(common[0]);
          if (idx!=-1) {
            t.splice(idx,1);
          } else {
            idx = t.indexOf(common[0]*-1);
            if (idx!=-1) {
              t[idx] = '-1';
            }
          } 
        });
      }

      if (terms_with_p.length == 1) e.splice(0,e.length,...[...terms_without_p,[p,...common.filter(x=>x!=p&&x!=1),terms_with_p[0]]]);
      if (terms_with_p.length > 1) e.splice(0,e.length,...[...terms_without_p,[p,...common.filter(x=>x!=p&&x!=1),terms_with_p]]);
    });  
  });
  

  return [all.map(x=>x.join('=')), expr]
}

export default polynomial;