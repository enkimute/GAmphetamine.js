// @ts-check
///////////////////////////////////////////////////////////////////////////////////////////
//
// This file implements a transpiler that substitutes arithmetic operators for javascript
// calls. Combined with a set of static implementations for each of these operators it
// enables flexible operator overloading for javascript. 
//
// The static methods that implement the operators below are responsible for runtime type
// checking and responding appropriately. Support for matrix and vector operations is
// implemented here, by broadcasting.
//
///////////////////////////////////////////////////////////////////////////////////////////
export default function linkTranspiler(Element, symElement, options) {

    // TypeOf helper
    const Type = x => x instanceof Element?'element':x instanceof symElement?'element':x instanceof Array?'array':typeof x;
    
    // Comparison operators. not used anymore right now. 
    if (options.normCompare) {
      Element.lt = function(a,b) { return (a.norm?a.norm():a)<(b.norm?b.norm():b);}
      Element.gt = function(a,b) { return (a.norm?a.norm():a)>(b.norm?b.norm():b);}
      Element.eq = function(a,b) { return (a.norm?a.norm():a)==(b.norm?b.norm():b);}
      Element.neq = function(a,b){ return (a.norm?a.norm():a)!=(b.norm?b.norm():b); }
    }
    
    /** 
     * Adding two elements. 
     */
    Element.add = function(a,b) {
        // First resolve functions. 
        while (a instanceof Function) a = a();
        while (b instanceof Function) b = b();
        // fetch the types.
        var ta = Type(a), tb = Type(b);
        if (ta === 'element' && tb === 'element') return a.add(b);
        // if either is a string, cast the other to string and concatenate.
        if (ta === 'string' || tb === 'string') return a.toString() + b.toString();  
        // 0 is neutral element    
        if (a === 0) return b;
        if (b === 0) return a;
        // Broadcast over arrays, component wise, zero-padd shortest.
        if (ta === 'array') { 
            if (tb === 'array') return (a.length<b.length)?b.map((b,i)=>Element.add(a[i]||0,b)):a.map((a,i)=>Element.add(a,b[i]||0));
            return a.map(a=>Element.add(a,b));
        };
        if (tb === 'array') return b.map(b=>Element.add(a,b));
        // if a is a number, make it a scalar mv so it has a '.add'
        if (ta == 'number') {
            if (tb == 'number') return a+b;
            a = new options.classes.scalar(a);
        }
        // now return by calling the multivector add.
        if (a.add) return a.add(b);
        return a+b;
    }

    /** 
     * Subtract two elements. 
     */
    Element.sub = function(a,b) {
        // First resolve any functions passed in.
        while (a instanceof Function) a = a();
        while (b instanceof Function) b = b();
        // 0 is neutral element.    
        if (b === 0) return a;
        // fetch the types.
        var ta = Type(a), tb = Type(b);
        if (ta === 'element' && tb === 'element') return a.sub(b);
        // Broadcast over arrays, component wise, zero-padd shortest.
        if (ta === 'array') {
            if (tb === 'array') return (a.length<b.length)?b.map((b,i)=>Element.sub(a[i]||0,b)):a.map((a,i)=>Element.sub(a,b[i]||0));
            return a.map(a=>Element.sub(a,b));
        }
        if (tb === 'array') return b.map(b=>Element.sub(a,b));
        // if a is a number, make it a scalar mv so it has a '.sub'
        if (ta == 'number') {
            if (tb == 'undefined') return -a;
            if (tb == 'number') return a-b;
            a = new options.classes.scalar(a);
        }
        // now return by calling the multivector sub.
        if (b === undefined) return (new options.classes.scalar(-1)).gp(a);
        if (a.sub) return a.sub(b);
        return a-b;
    }

    /** 
     * The geometric product. 
     */
    Element.gp = function(a,b) {
        // resolve functions
        while (a instanceof Function) a = a();
        while (b instanceof Function) b = b();
        // Grab the types
        var ta = Type(a), tb = Type(b);
        if (ta === 'element' && tb ==='element') return a.gp(b);
        // broadcasting here means matrix math. (vec-vec, mat-vec, mat-mat)
        if(ta === 'array' && tb === 'array') {
            if (!(b[0] instanceof Array) || /**@type object */ (b[0]).gp) {
                // vector-vector dot product.  
                if((!(a[0] instanceof Array) || /**@type object*/(a[0]).gp) && a.length == b.length ) return a.reduce((s, ea, i)=>{ s = Element.add(s,Element.gp(ea,b[i])); return s; },0);
                // matrix-vector product.   
                var r = a.map((_,i)=>Element.gp(a[i],b));
                for (var i=0; i<2; ++i) if (r.length == 1) r = r[0]; 
                return r;
            }
            // matrix-matrix product.
            if (b[0] instanceof Array && a[0].length == b.length) var r = a.map((a,i)=>b[0].map((_,j)=>Element.gp(a,a.map((_,k)=>b[k][j])))); 
            for (var i=0; i<2; ++i) if (r.length == 1) r = r[0]; 
            return r;
        }
        if (ta === 'array') return a.map(a=>Element.gp(a,b));
        if (tb === 'array') return b.map(b=>Element.gp(a,b));
        // If we have normal numbers upgrade to class.
        if (ta == 'number') {
            if (tb === 'number') return a*b;
            if (b instanceof symElement)
              a = new options.symClasses.scalar(a);
            else 
              a = new options.classes.scalar(a);
        }
        // If lhs is a string, upgrade to a symbolic class!
        if (ta === 'string') {
            a = new options.symClasses.scalar(a);  
            if (tb === 'string') b = new options.symClasses.scalar(b)
        } 
        // Now execute the mv gp.
        if (a.gp) {
          if (tb === 'number' && a instanceof symElement) b = new options.symClasses.scalar(b);
          return a.gp(b);
        }  
    }

    /** 
     * Dividing two elements. 
     */
    Element.div = function(a,b) {
      // Resolve functions
      while (a instanceof Function) a = a();
      while (b instanceof Function) b = b();
      // Grab the types.
      var ta = Type(a), tb = Type(b);
      if (ta === 'element' && tb ==='element') return a.gp(b.inverse());
      // Broadcast over arrays
      if (ta === 'array') return a.map(a=>Element.div(a,b));
      if (tb === 'array') return b.map(b=>Element.div(a,b));
      // Now resolve numbers/mv's
      if (ta == 'number') {
        if (tb == 'number') return a/b;
        if (a === 1) return b.inverse();
        a = new options.classes.scalar(a);
      } else if (tb == 'number') return a.gp(1/b);
      return a.gp(b.inverse());
    }

    /** 
     * Outer product of two elements. 
     */
    Element.op = function(a,b) {
      // Resolve passed in functions.
      while (a instanceof Function) a = a();
      while (b instanceof Function) b = b();
      // Grab the types.
      var ta = Type(a), tb = Type(b);
      if (ta === 'element' && tb ==='element') return a.op(b);
      // Broadcast over arrays
      if (ta === 'array') return a.map(a=>Element.op(a,b));
      if (tb === 'array') return b.map(b=>Element.op(a,b));
      // Now resolve mv's / numbers
      if (ta == 'number') {
        if (tb == 'number') return a^b;
        a = new options.classes.scalar(a);
      }  
      return a.op(b??0);
    }

    /** 
     * Inner product of two elements. 
     */
    Element.ip = function(a,b) {
      // Resolve passed in functions.
      while (a instanceof Function) a = a();
      while (b instanceof Function) b = b();
      // Grab the types.
      var ta = Type(a), tb = Type(b);
      if (ta === 'element' && tb ==='element') return a.ip(b);
      // Broadcast over arrays
      if (ta === 'array') return a.map(a=>Element.ip(a,b));
      if (tb === 'array') return b.map(b=>Element.ip(a,b));
      // Now resolve mv's / numbers
      if (ta == 'number') {
        if (tb == 'number') return a|b;
        a = new options.classes.scalar(a);
      }  
      return a.ip(b);
    }

    /** 
     * Left contraction product of two elements. 
     */
    Element.lip = function(a,b) {
      // Resolve passed in functions.
      while (a instanceof Function) a = a();
      while (b instanceof Function) b = b();
      // Grab the types.
      var ta = Type(a), tb = Type(b);
      if (ta === 'element' && tb ==='element') return a.lip(b);
      // Broadcast over arrays
      if (ta === 'array') return a.map(a=>Element.lip(a,b));
      if (tb === 'array') return b.map(b=>Element.lip(a,b));
      // Now resolve mv's / numbers
      if (ta == 'number') {
        if (tb == 'number') return a|b;
        a = new options.classes.scalar(a);
      }  
      return a.lip(b);
    }

    /** 
     * Right contraction product of two elements. 
     */
    Element.rip = function(a,b) {
      // Resolve passed in functions.
      while (a instanceof Function) a = a();
      while (b instanceof Function) b = b();
      // Grab the types.
      var ta = Type(a), tb = Type(b);
      if (ta === 'element' && tb ==='element') return a.rip(b);
      // Broadcast over arrays
      if (ta === 'array') return a.map(a=>Element.rip(a,b));
      if (tb === 'array') return b.map(b=>Element.rip(a,b));
      // Now resolve mv's / numbers
      if (ta == 'number') {
        if (tb == 'number') return a|b;
        a = new options.classes.scalar(a);
      }  
      return a.rip(b);
    }

    /** 
     * Regressive product of two elements. 
     */
    Element.rp = function(a,b) {
      // Resolve passed in functions.
      while (a instanceof Function) a = a();
      while (b instanceof Function) b = b();
      // Grab the types.
      var ta = Type(a), tb = Type(b);
      if (ta === 'element' && tb ==='element') return a.rp(b);
      // Broadcast over arrays
      if (ta === 'array') return a.map(a=>Element.rp(a,b));
      if (tb === 'array') return b.map(b=>Element.rp(a,b));
      // Now resolve mv's / numbers
      if (ta == 'number') {
        if (tb == 'number') return a&b;
        a = new options.classes.scalar(a);
      }  
      return a.rp(b);
    }

    /** 
     * a to the power of b
     */
    Element.pow = function(a,b) {
      // Resolve functions
      while (a instanceof Function) a = a();
      while (b instanceof Function) b = b();
      // Early out if both numbers.
      if (typeof a == 'number' && typeof b == 'number') return a**b;
      // Pick out b=[0, -1, 0.5, 2] 
      if (b===0) return 1;
      if (b===-1) return a.inverse();
      if (b===0.5) return a.sqrt();
      if (b===2) return a.gp(a);
      // Pick out a=[E, 0, 1]
      if (a===Math.E) return b.exp();
      if (a===0 || a===1) return a;
      // Broadcast over arrays.
      if (a instanceof Array) return a.map(a=>Element.pow(a,b));
      if (b instanceof Array) return b.map(b=>Element.pow(a,b));
      // Natural powers in O(log b)
      if (typeof b === 'number' && (b|0)==b && b>=0) {
        for (var r = 1; b; b >>= 1) {
          if (b & 1) r = Element.gp(r, a);
          a = Element.gp(a, a);
        }
        return r;
      }
    }

    /** 
     * Sandwich product.
     */
    Element.sw = function(a,b) {
      // First resolve functions
      while (a instanceof Function) a = a();
      while (b instanceof Function) b = b();
      // Grab types.
      var ta = Type(a), tb = Type(b);
      // Array broadcast.
      if (ta === 'array') return a.map(a=>Element.sw(a,b));
      if (tb === 'array') return b.map(b=>Element.sw(a,b));
      // Now handle multivectors/numbers.
      if (ta === 'number') {
        if (tb === 'number') return a>>>b;
        if (a === 1) return b;
      } else if (tb === 'number' || tb === 'string') return b;
      return a.sw?a.sw(b):a;
    }

    /** 
     * Calculate the dual of an element.
     */
    Element.dual = function(a) {
      // First resolve functions
      while (a instanceof Function) a = a();
      var ta = Type(a);
      // Process mv's first.
      if (a.dual) return a.dual();
      // Process arrays
      if (ta === 'array') return a.map(x=>Element.dual(x));
      return !a;
    }

    /** 
     * Clifford Conjugate.
     */
    Element.conjugate = function(a) {
      // First resolve functions
      while (a instanceof Function) a = a();
      var ta = Type(a);
      if (ta == 'number') return ~a
      return a.conjugate();
    }

    /** 
     * Reversion
     */
    Element.reverse = function(a) {
      var ta = Type(a);
      if (ta == 'number') return ~a
      return a.reverse();
    }

    /** 
     * Length operator - maps to norm.
     */
    Element.Length = function(a) {
      var ta = typeof a;
      if (ta == 'number') return a;
      if (a.norm) return a.norm();
      return 0;
    }

    Element.Normalized = function(a) {
      if (a && a.normalized) return a.normalized();
      return a;
    }
      
    // The transpiler.
    Element.inline = function(intxt) {
      // The inline function is a js to js translator that adds operator overloading and algebraic literals.
      // It can be called with a function, a string, or used as a template function.
  
        // If we are called as a template function.
          if (arguments.length>1 || intxt instanceof Array) {
            var args=[].slice.call(arguments,1);
            return options.inline(new Function(args.map((x,i)=>'_template_'+i).join(),'return ('+intxt.map((x,i)=>(x||'')+(args[i]&&('_template_'+i)||'')).join('')+')')).apply(options,args);
          }
        // Get the source input text.
          var txt = (intxt instanceof Function)?intxt.toString():`function(){return (${intxt})}`;
        // Our tokenizer reads the text token by token and stores it in the tok array (as type/token tuples).
          var tok = [], resi=[], t, possibleRegex=false, c, tokens = [/^[\s\uFFFF]|^[\u000A\u000D\u2028\u2029]|^\/\/[^\n]*\n|^\/\*[\s\S]*?\*\//g,                 // 0: whitespace/comments
            /^\"\"|^\'\'|^\".*?[^\\]\"|^\'.*?[^\\]\'|^\`[\s\S]*?[^\\]\`/g,                                                                // 1: literal strings
            /^\d+[.]{0,1}\d*[ei][\+\-_]{0,1}\d*|^\.\d+[ei][\+\-_]{0,1}\d*|^e_\d*/g,                                                       // 2: literal numbers in scientific notation (with small hack for i and e_ asciimath)
            /^\d+[.]{0,1}\d*[E][+-]{0,1}\d*|^\.\d+[E][+-]{0,1}\d*|^0x\d+|^\d+[.]{0,1}\d*|^\.\d+/g,                                        // 3: literal hex, nonsci numbers
            /^\/.*?[^\\]\/[gmisuy]?/g,                                                                                                    // 4: regex
            /^(\.Normalized|\.Length|\.\.\.|>>>=|===|!==|>>>|<<=|>>=|=>|\|\||[<>\+\-\*%&|^\/!\=]=|\*\*|\+\+|\-\-|<<|>>|\&\&|\^\^|^[{}()\[\];.,<>\+\-\*%|&^!~?:=\/]{1})/g,   // 5: punctuator
            /^[$_\p{L}][$_\p{L}\p{Mn}\p{Mc}\p{Nd}\p{Pc}\u200C\u200D]*/gu]                                                                 // 6: identifier
          while (txt.length) for (t in tokens) {
            if (t == '4' && !possibleRegex) continue;
            if (resi = txt.match(tokens[t])) {
              c = resi[0]; if (t!='0') {possibleRegex = c == '(' || c == '=' || c == '[' || c == ',' || c == ';';} tok.push([Number(t), c]); txt = txt.slice(c.length); break;
            }} // tokenise
        // Translate algebraic literals. (scientific e-notation to "this.Coeff"
          tok=tok.map(t=>(t[0]==2)?[2,`Element.coeff("e${t[1].split('e')[1]}",${t[1].split('e')[0]})`]:t);
        // String templates (limited support - needs fundamental changes.).
          tok=tok.map(t=>(t[0]==1 && t[1][0]=='`')?[1,t[1].replace(/\$\{(.*?)\}/g,a=>"${"+Element.inline(a.slice(2,-1)).toString().match(/return \((.*)\)/)[1]+"}")]:t);  
        // We support two syntaxes, standard js or if you pass in a text, asciimath.
          const syntax = [
            [['.Normalized','Normalized',2],['.Length','Length',2]],
            [['~','reverse',1],['!','dual',1]],
            [['**','pow',0,1]],
            [['^','op'],['&','rp'],['<<','lip'],['>>','rip']],
            [['*','gp'],['/','div']],
            [['|','ip']],[['>>>','sw',0,1]],
            [['-','sub'],['+','add']],
            [['%','%']],
            options.normCompare ? [['==','eq'],['!=','neq'],['<','lt'],['>','gt'],['<=','lte'],['>=','gte']] : undefined
          ].filter(x=>x);
        // For asciimath, some fixed translations apply (like pi->Math.PI) etc ..
          tok=tok.map(t=>(t[0]!=6)?t:[].concat.apply([],syntax).filter(x=>x[0]==t[1]).length?[6,[].concat.apply([],syntax).filter(x=>x[0]==t[1])[0][1]]:t);
        // Now the token-stream is translated recursively.
          function translate(tokens) {
            // helpers : first token to the left of x that is not of a type in the skip list.
            var left = (x=ti-1,skip=[0])=>{ while(x>=0&&~skip.indexOf(tokens[x][0])) x--; return x; },
            // first token to the right of x that is not of a type in the skip list.
                right= (x=ti+1,skip=[0])=>{ while(x<tokens.length&&~skip.indexOf(tokens[x][0])) x++; return x; },
            // glue from x to y as new type, optionally replace the substring with sub.
                glue = (x,y,tp=6,sub)=>{tokens.splice(x,y-x+1,[tp,...(sub||tokens.slice(x,y+1))])},
            // match O-C pairs. returns the 'matching bracket' position
                match = (O="(",C=")")=>{var o=1,x=ti+1; while(o){if(tokens[x][1]==O)o++;if(tokens[x][1]==C)o--; x++;}; return x-1;};
            // grouping (resolving brackets).
            for (var ti=0,t,si=0;t=tokens[ti];ti++) if (t[1]=="(") glue(ti,si=match(),7,[[5,"("],...translate(tokens.slice(ti+1,si)),[5,")"]]);
            // [] dot call and new
            for (var ti=0,t,si=0; t=tokens[ti];ti++) {
              if (t[1]=="[") { glue(ti,si=match("[","]"),7,[[5,"["],...translate(tokens.slice(ti+1,si)),[5,"]"]]); if (ti)ti--;}    // matching []
              else if (t[1]==".") { glue(left(),right()); ti--; }                                                                   // dot operator
              else if (t[0]==7 && ti && left()>=0 && tokens[left()][0]>=6 && tokens[left()][1]!="return") { glue(left(),ti--) }     // collate ( and [
              else if (t[1]=='new') { glue(ti,right()) };                                                                           // collate new keyword
            }
            // ++ and --
            for (var ti=0,t; t=tokens[ti];ti++) if (t[1]=="++" || t[1]=="--") glue(left(),ti);
            // unary - and + are handled separately from syntax ..
            for (var ti=0,t,si=0; t=tokens[ti];ti++)
              if (t[1]=="-" && (left()<0 || (tokens[left()]||[5])[0]==5)) glue(ti,right(),6,["Element.sub(",tokens[right()],")"]);   // unary minus works on all types.
              else if (t[1]=="+" && (tokens[left()]||[0])[0]==5 && (tokens[left()]||[0])[1][0]!=".") glue(ti,ti+1);                   // unary plus is glued, only on scalars.
            // now process all operators in the syntax list ..
            for (var si=0,s; s=syntax[si]; si++) for (var ti=s[0][3]?tokens.length-1:0,t; t=tokens[ti];s[0][3]?ti--:ti++) for (var opi=0,op; op=s[opi]; opi++) if (t[1]==op[0]) {
              // exception case .. ".Normalized" and ".Length" properties are re-routed (so they work on scalars etc ..)
                    if (op[2]==2) { var arg=tokens[left()]; glue(ti-1,ti,6,["Element."+op[1],"(",arg,")"]); }
              // unary operators (all are to the left)
                else if (op[2])    { var arg=tokens[right()]; glue(ti, right(), 6, ["Element."+op[1],"(",arg,")"]); }
              // binary operators
                              else { var l=left(),r=right(),a1=tokens[l],a2=tokens[r]; if (op[0]==op[1]) glue(l,r,6,[a1,op[1],a2]); else glue(l,r,6,["Element."+op[1],"(",a1,",",a2,")"]); ti--; }
            }
            return tokens;
        }
      // Glue all back together and return as bound function.
      return eval( ('('+(function f(t){return t.map(t=>t instanceof Array?f(t):typeof t == "string"?t:"").join('');})(translate(tok))+')') );
    }
}