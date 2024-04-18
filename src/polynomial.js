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

// Common Subexpression Elimination. We eliminate re-used multiplications
// by repeating the extraction of the most common pair. Additionally, we
// allow factors in protect to be excluded and those in isolate to be
// moved outside brackets in the final expression.

// @ts-ignore
polynomial.cse = (expr, prot, iso) => {
  var comments = [];
  if (!(expr instanceof Array)) return expr;
  let isolate = (expr, recurse=0)=>{
    if (recurse++ >= 8 || !(expr instanceof Array)) return expr;
    const space = [...Array(2*recurse)].fill(' ').join('');
    // Find all factors.
      var factors = {};
      expr.forEach( term => term.forEach( (factor,fi)=>{
         if (term.indexOf(factor) != fi) return; 
         const key = isNaN(factor)? factor : Math.abs(factor);
         factors[key] = (factors[key]??0)+1; 
      }));
      // console.log(space,'expr = ', polynomial.format(expr));
    // Filter out to those that occur more than once.
      var factorList = Object.entries(factors)
                             .filter(([a,b])=>b>=2 && a!='1')
                           /*.sort((a,b)=>a[0]<b[0]?1:-1)*/
                            // .sort((a,b)=>b[1]-a[1]);
      if (factorList.length == 0) return expr;

   //   if (factorList.length>1 && factorList[0][1] > factorList[1][1]) factorList = [factorList[0]];
   //   factorList = factorList.filter(x=>x[1] == factorList[0][1]); 
      // @ts-ignore
      factorList = factorList.map(x=>x[0]);

      let countA = factorList.filter(x=>x[0]=='a').length;
      let countB = factorList.filter(x=>x[0]=='b').length;
    // Force early processing of 2 and potential scalar factor ..  
       
      // @ts-ignore
      if (factors[2]>1) factorList=['2'];
      // @ts-ignore
      else if (countA > countB && factorList.length>1 && factors['a[0]']>1) factorList = ['a[0]'];
      else if (countA > countB && factorList.find(x=>x[0]=='a')) factorList = /* [factorList.find(x=>x[0]=='a')];// */factorList.filter(a=>a[0]=='a').slice(0,2); 
   //else if (factorList.find(x=>x[0]=='b')) factorList = /* [factorList.find(x=>x[0]=='a')];// */factorList.filter(a=>a[0]=='b').slice(0,2); 
   // Now consider all factors and what final length they produce.
      var lengthList = factorList.map( factor=>{
        //console.log(space,'consider '+factor);  
        // First split into terms with and without.
        const terms_with    = expr.filter( term => term.find( f=> isNaN(f)?f==factor:Math.abs(f)==Number(factor) ) );  
        const terms_without = expr.filter( term => terms_with.find(t => term==t) == undefined);
        //console.log('with, without :', terms_with, terms_without);  
        // split up and recurse.
        const A = isolate(terms_without, recurse);
        const B = isolate(terms_with.map(term=>{
            const index = term.findIndex( f=>isNaN(f)?f==factor:Math.abs(f)==/**@type unknown*/ (factor) );
            // @ts-ignore
            // @ts-ignore
            if (isNaN(factor)) return term.filter((x,i)=>i!=index);
            // @ts-ignore
            term[index] /= factor;
            return term;
        }), recurse);  
        // return the total number of subgroups (we always exhaust all factors, so less is better)
        const R = (B.find(t=>t[0]>0))
           // @ts-ignore
           ?[ ...A, [...isNaN(factor)?[1]:[], factor, B]]
           // @ts-ignore
           :[ ...A, [...isNaN(factor)?[-1]:[], factor, polynomial.neg(B)]];
        //console.log(space,'consider '+factor+' '+polynomial.format(R));  
        return [factor,R]; //polynomial.format(R).match(/[\(]/g).length; 
      }).sort((a,b)=>{
        const [fA,fB] = [polynomial.format(a[1]),polynomial.format(b[1])];
        const [lA,lB] = [fA.length,fB.length];
        const AhasB = fA.match(/b\[\d+\]\*\(/);   
        const BhasB = fB.match(/b\[\d+\]\*\(/);
        if (lA == lB && AhasB && !BhasB) return 1;
        if (lA == lB && !AhasB && BhasB) return -1;
        //if (lA == lB) return (b[0]>a[0])?-1:1;
        return lA-lB;
      });   
    // Return the shortest option.
      //if (factorList.length>1) 
      // @ts-ignore
      comments.push('\n'+'// '+space+'>> '+JSON.stringify( lengthList.map(([a,b])=>[a,/*polynomial.format(b)*/]) ));
      return lengthList[0][1]; 
  }  
  // First do per expression isolation. 
  let res = expr.map(e=>isolate(e));
// now find the double products left ..
const prods = {};
const findProds = expr=>expr.forEach(term=>{
   if (term[term.length-1] instanceof Array) return findProds(term[term.length-1]);
   for(var i=1; i<term.length-1; ++i)
     for(var j=i+1; j<term.length; ++j) {
       if (term[i].match(/\(/) || term[j].match(/\(/)) continue;
       const key = term[i] + '*' + term[j];
       prods[key] = (prods[key]??0)+1;
     }
});
res.forEach(p=>p instanceof Array && findProds(p));
// @ts-ignore
const prodList = Object.entries(prods).filter(([a,b])=>b>1).map(([a,b])=>a);
const substProds = expr=>expr.forEach((term)=>{
  if (term[term.length-1] instanceof Array) return substProds(term[term.length-1]);
  for (var i=1; i<term.length-1; ++i)
    for (var j=i+1; j<term.length; ++j) {
      const key = term[i] + '*' + term[j];
      if (prods[key] > 1) {
        term.splice(i,1,key.replace(/[\[\]\*]/g,''));
        term.splice(j,1);
      }
    }
})
res.forEach(p=>p instanceof Array && substProds(p));
// Now collect same terms.
  let terms = {};
  let scanTerms = expr=>{
     if (expr.length == 1) return; 
     const le = expr[expr.length-1]; 
     const lle = le[le.length-1];
     if (lle instanceof Array) return expr.forEach( x=>{ if (x[x.length-1] instanceof Array) scanTerms(x) } );
     terms[polynomial.format(expr)] = (terms[polynomial.format(expr)]??0) + 1;
  }
  res.forEach(p=>p instanceof Array && scanTerms(p));
  // @ts-ignore
  const termsE = Object.entries(terms).filter(([a,b])=>b>1).map(([a,b])=>a); 
// replacer
  let replace = (expr) => {
     // @ts-ignore
     expr.forEach( (term,i,a) => {
       term.forEach( (factor,j,b) => {
         if (factor instanceof Array) {
            const lit = polynomial.format(factor);
            const nlit = polynomial.format(polynomial.neg(factor));
            if (terms[lit]>1) b[j] = 's' + termsE.indexOf(lit);
            if (terms[nlit]>1) {
                b[0] *= -1;
                b[j] = 's' + termsE.indexOf(nlit);
            } else replace(factor);
         }    
       } );  
     }); 
     return expr; 
  }
  const final = res.map(res=>res instanceof Array?replace(res):res);
    // at this point, we may still have re-used sums .. lets find them
    var sums = {};
    const scanSum = expr => {
      if (expr.find( term => term.find(factor => factor[factor.length-1] instanceof Array) ))
        return expr.forEach( term=> term.forEach( factor =>{ if (factor instanceof Array) scanSum(factor) }) );
      for (var i=0; i<expr.length-1; ++i)
        for (var j=i+1; j<expr.length; ++j) {
          const key = (expr[i][0]>0)?polynomial.format([expr[i],expr[j]]):polynomial.format(polynomial.neg([expr[i],expr[j]]));
          sums[key] = (sums[key]??0)+1;
        }  
    }
    const replaceSum = (expr, s, r) => {
      if (expr && expr.find( term => term.find(factor => factor[factor.length-1] instanceof Array) ))
        // @ts-ignore
        return expr.forEach( (term,ti,terms)=> term.forEach( (factor,i,a) =>{ if (factor instanceof Array) {
          replaceSum(factor,s,r);
          if (factor.length==1 && factor[0].length==2) {
            if (factor[0][0]<0) a[0] *= -1;
            a[i] = factor[0][1];
          } else if (factor.length>=2 && !factor.find(f=>f[0]>0)) {
            factor.forEach(f=>f[0]*=-1);
            a[0]*=-1;
          }
        }}) );
      for (var i=0; i<expr.length-1; ++i)
        for (var j=i+1; j<expr.length; ++j) {
          const key = (expr[i][0]>0)?polynomial.format([expr[i],expr[j]]):polynomial.format(polynomial.neg([expr[i],expr[j]]));
          if (key == s) {
              expr[i][1] = r;
              expr.splice(j,1);
              return;
          }
        }
    }  
    var count=0, sumList = [];
    while (count < 6) {
      sums = {};
      final.forEach(f=>f instanceof Array && scanSum(f));
      // @ts-ignore
      const dsums = Object.entries(sums).filter(([a,b])=>b>1).sort((a,b)=>b[1]-a[1]).shift();
      if (dsums) { 
        final.forEach(x=>replaceSum(x, dsums[0],'t'+count));
        sumList.push('t'+count+'='+dsums[0]);
      } else break;
      count++;
    }
    return [[/*...comments,*/...prodList.map((x,i)=>((i%5)?'':'\n    ')+x.replace(/[\[\]\*]/g,'')+'='+x/*.replace(/(.?\])(.*?\])/,'$1*$2')*/),
             ...termsE.map((x,i)=>(i==0?'\n    ':'')+'s'+i+'='+x), 
             ...sumList.map((x,i)=>i?x:'\n    '+x)],
             final];

}

/** @type {function(array, any=, array=): array} */
polynomial.cse2 = (expr, protect=[], isolate=[...protect,2,0.5,"t"])=>{

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
    var [sname,scount] = Object.entries(se).sort((a,b)=>((b[1]-a[1])==0)?(a[0]>b[0]?-1:1):(b[1]-a[1]))[0]||[0,0];
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
  // Helper for sum subst
  const leafs = (x, r=[])=>{
    var hasArray = x.find(x=>x.find&&x.find(x=>x instanceof Array));
    if (hasArray) {
        x.forEach(x=>x instanceof Array?leafs(x,r):0);
    } else if (isNaN(x[0]) && x.length>1) r.push([1,x]);
    return r;
  };
  const replace = (x, a, b)=>{
    x.forEach((x2,i)=>{
      if (x2 + '' == a + '') {
        x[i] = b;
      } else if (x2 instanceof Array) replace(x2,a,b);
    })
  }

  // Isolate
  isolate.forEach(p=>{
    // @ts-ignore
    expr.forEach((e,ei,ea)=>{
      if (!(e instanceof Array)) return;
    
      // split the terms in those with and without factor to isolate. 
      // @ts-ignore
      var terms_with_p = e.filter(product=>~product.indexOf(p)||~product.indexOf(-p)).map(t=>t.filter((f,i)=>i!=t.indexOf(p)).map(f=>f==-p?-1:f));

      var terms_without_p = e.filter(product=>!~product.indexOf(p)&&!~product.indexOf(-p));
      
      // Count how many common factors there are and collect them
      var common = {}, commonE = {};
      if (terms_with_p.length == 1) return;
      terms_with_p.forEach(t=>{
        var thisrun = {};
        t.forEach(f=>{
          var n = (''+f).replace('-',''); if (n==='1') return;
          if (thisrun['_'+n] === undefined) {
            common['_'+n] = (common['_'+n]||0)+1;
            commonE['_'+n] = f<0?-f:f;
            thisrun['_'+n] = 1;
          }
        });
      })
      // @ts-ignore
      common = Object.entries(common).filter(([n,c])=>c==terms_with_p.length).map(([n,c])=>commonE[n]);

      // If there are common factors, do the substitution.
      if (common.length) {
        // @ts-ignore
        terms_with_p.forEach((t,ti,ta)=>{
          var idx = t.indexOf(common[0]);
          if (idx!=-1) {
            if (idx == 0) t[idx] = '1'; else t.splice(idx,1);
          } else {
            idx = t.indexOf(common[0]*-1);
            if (idx!=-1) {
              t[idx] = '-1';
            }
          } 
        });
      }
      var sign = [];
      if (terms_with_p.length >= 2 && !isNaN(terms_with_p[0][0]) && !(terms_with_p[0][0] < 0)) {
        sign=[-1];
        terms_with_p = polynomial.neg(terms_with_p);
      }

      // @ts-ignore
      if (!terms_with_p.find(([a,b])=>isNaN(a) || a>0)) {
        console.log(JSON.stringify(terms_with_p));
        sign = (sign[0]==-1)?[]:[-1];
        terms_with_p.forEach(x=>x[0]*=-1);
      }
      

      if (terms_with_p.length == 1) e.splice(0,e.length,...[...terms_without_p,[...common.filter(x=>x!=p&&x!=1),p,terms_with_p[0]]]);
      if (terms_with_p.length > 1) e.splice(0,e.length,...[...terms_without_p,[...common.filter(x=>x!=p&&x!=1),...sign,p,terms_with_p]]);
    });  
  });
  
  var l  = leafs(expr);
  var ul = l.filter((x,i,a)=>a.findIndex(y=>x+''==y+'')==i)
            .filter(x=>l.filter(y=>y+''==x+'').length>1);
  if (ul.length) {
    ul.forEach((x,i)=>{
      all.push([(i==0?'\n  ':'')+'s'+i,polynomial.format(x[1])]);
      replace(expr, x[1], 's'+i);
    });
  
  }
  return [all.map(x=>x.join('=')), expr]
}

export default polynomial;