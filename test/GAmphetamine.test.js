// Import the module
import GAmphetamine from '../src/GAmphetamine';

// Tests
describe('GAmphetamine', () => {

  /////////////////////////////////////////////////////////////////////////////
  // CONSTRUCTING - NATURAL BASIS
  /////////////////////////////////////////////////////////////////////////////
  describe('natural basis.', ()=>{ 

    test('ℝ₀', ()=>{
       const R0 = GAmphetamine();
       expect(R0.options.basis).toEqual(["1"]);
     });  

     test('ℝ₁', ()=>{
        const R1 = GAmphetamine(1);
        expect(R1.options.basis).toEqual(["1","e1"]);
      });  

      test('ℝ₂', ()=>{
        const R2 = GAmphetamine(2);
        expect(R2.options.basis).toEqual(["1","e1","e2","e12"]);
      });  

      test('ℝ₃', ()=>{
        const R3 = GAmphetamine(3);
        expect(R3.options.basis).toEqual(['1', 'e1', 'e2', 'e3', 'e12', 'e13', 'e23', 'e123']);
      });  

      test('ℝ₄', ()=>{
        const R4 = GAmphetamine(4);
        expect(R4.options.basis).toEqual(['1', 'e1', 'e2', 'e3', 'e4', 'e12', 'e13', 'e14', 'e23', 'e24', 'e34', 'e123', 'e124', 'e134', 'e234', 'e1234']);
      });  

      test('ℝ₅', ()=>{
        const R5 = GAmphetamine(5);
        expect(R5.options.basis).toEqual(['1', 'e1', 'e2', 'e3', 'e4', 'e5', 'e12', 'e13', 'e14', 'e15', 'e23', 'e24', 'e25', 'e34', 'e35', 'e45', 'e123', 'e124', 'e125', 'e134', 'e135', 'e145', 'e234', 'e235', 'e245', 'e345', 'e1234', 'e1235', 'e1245', 'e1345', 'e2345', 'e12345']);
      });  

      test('ℝ₆', ()=>{
        const R6 = GAmphetamine(6);
        expect(R6.options.basis).toEqual(['1', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e12', 'e13', 'e14', 'e15', 'e16', 'e23', 'e24', 'e25', 'e26', 'e34', 'e35', 'e36', 'e45', 'e46', 'e56', 'e123', 'e124', 'e125', 'e126', 'e134', 'e135', 'e136', 'e145', 'e146', 'e156', 'e234', 'e235', 'e236', 'e245', 'e246', 'e256', 'e345', 'e346', 'e356', 'e456', 'e1234', 'e1235', 'e1236', 'e1245', 'e1246', 'e1256', 'e1345', 'e1346', 'e1356', 'e1456', 'e2345', 'e2346', 'e2356', 'e2456', 'e3456', 'e12345', 'e12346', 'e12356', 'e12456', 'e13456', 'e23456', 'e123456']);
      });  
      
  });

  /////////////////////////////////////////////////////////////////////////////
  // CONSTRUCTING - ALGEBRA SPECIFIC BASIS
  /////////////////////////////////////////////////////////////////////////////

  describe('algebra specific basis.', ()=>{ 

    test('2DPGA', ()=>{
       const R = GAmphetamine("2DPGA");
       expect(R.options.basis).toEqual(['1', 'e1', 'e2', 'e0', 'e20', 'e01', 'e12', 'e012']);
    });  

    test('3DPGA', ()=>{
      const R = GAmphetamine("3DPGA");
      expect(R.options.basis).toEqual(['1', 'e1', 'e2', 'e3', 'e0', 'e01', 'e02', 'e03', 'e12', 'e31', 'e23', 'e032', 'e013', 'e021', 'e123', 'e0123']);
    });  

    test('STAP', ()=>{
      const R = GAmphetamine("STAP");
      expect(R.options.basis).toEqual(['1', 'e0', 'e1', 'e2', 'e3', 'e4', 'e01', 'e02', 'e03', 'e40', 'e12', 'e31', 'e23', 'e41', 'e42', 'e43', 'e234', 'e314', 'e124', 'e123', 'e014', 'e024', 'e034', 'e032', 'e013', 'e021', 'e0324', 'e0134', 'e0214', 'e0123', 'e1234', 'e01234']);
    });  
      
  });

  /////////////////////////////////////////////////////////////////////////////
  // DEGENERATE DUALS
  /////////////////////////////////////////////////////////////////////////////

  describe('degenerate duals', ()=>{ 

    test('2DPGA', ()=>{
      const R = GAmphetamine("2DPGA");
      expect(R.options.basis).toEqual(['1', 'e1', 'e2', 'e0', 'e20', 'e01', 'e12', 'e012']);
      expect(R.options.dualBasis).toEqual([[1,7],[1,4],[1,5],[1,6],[1,1],[1,2],[1,3],[1,0]]);
    });  

    test('ℝ₃₀₁', ()=>{
      const R = GAmphetamine(3,0,1);
      expect(R.options.basis).toEqual(["1","e0","e1","e2","e3","e01","e02","e03","e12","e13","e23","e012","e013","e023","e123","e0123"]);
      expect(R.options.dualBasis).toEqual([[1,15],[-1,14],[1,13],[-1,12],[1,11],[1,10],[-1,9],[1,8],[1,7],[-1,6],[1,5],[-1,4],[1,3],[-1,2],[1,1],[1,0]]);
    });  

    test('3DPGA', ()=>{
      const R = GAmphetamine("3DPGA");
      expect(R.options.basis).toEqual(['1', 'e1', 'e2', 'e3', 'e0', 'e01', 'e02', 'e03', 'e12', 'e31', 'e23', 'e032', 'e013', 'e021', 'e123', 'e0123']);
      expect(R.options.dualBasis).toEqual([[1,15],[-1,11],[-1,12],[-1,13],[-1,14],[1,10],[1,9],[1,8],[1,7],[1,6],[1,5],[1,1],[1,2],[1,3],[1,4],[1,0]]);
    });  

  });

  /////////////////////////////////////////////////////////////////////////////
  // startIndex
  /////////////////////////////////////////////////////////////////////////////

  describe('Construction - startIndex.', ()=>{ 
    
    test('index 1',()=>{
       const sig = GAmphetamine(1,()=>Element.options.basis);
       expect(sig).toEqual(["1","e1"]); 
    })

    test('index 0',()=>{
        const sig = GAmphetamine(1,{startIndex:0},()=>Element.options.basis);
        expect(sig).toEqual(["1","e0"]); 
     })

  })

  /////////////////////////////////////////////////////////////////////////////
  // METRIC SIGNATURES, STRINGS, OPTIONS
  /////////////////////////////////////////////////////////////////////////////

  describe('Construction - metrics.', ()=>{ 
    
    test('signature 1,1,1',()=>{
       const sig = GAmphetamine(1,1,1,()=>Element.options.metric);
       expect(sig).toEqual([0,1,-1]) 
    })

    test('signature "0+-"',()=>{
        const sig = GAmphetamine("0+-",()=>Element.options.metric);
        expect(sig).toEqual([0,1,-1]) 
     })

     test('signature "-+0"',()=>{
        const sig = GAmphetamine("-+0",()=>Element.options.metric);
        expect(sig).toEqual([-1,1,0]) 
     })

     test('signature interleaved 1,{},1,{},1',()=>{
      const sig = GAmphetamine(1,{},1,{},1,()=>Element.options.metric);
      expect(sig).toEqual([0,1,-1]) 
     })

     test('metric [0.5,-0.5,0]',()=>{
        const sig = GAmphetamine({metric:[0.5,-0.5,0]},()=>Element.options.metric);
        expect(sig).toEqual([0.5,-0.5,0]) 
     })

     test('{p:1, q:1, r:1}',()=>{
        const sig = GAmphetamine({p:1, q:1, r:1},()=>Element.options.metric);
        expect(sig).toEqual([0,1,-1]) 
     })
     
  });

  /////////////////////////////////////////////////////////////////////////////
  // CUSTOM BASIS ORDER AND PERMUTATIONS
  /////////////////////////////////////////////////////////////////////////////

  describe('Custom basis order.', ()=>{ 

    test('swap in grade', ()=>{
       const A = GAmphetamine(2, {basis:["1", "e2", "e1", "e12"]});
       const R = A.inline(()=>1 + 2e1 + 3e2 + 4e12)();
       expect(R).toEqual(A.multivector(1, 3, 2, 4));
    })

    test('swap in grade + blade permutation', ()=>{
      const A = GAmphetamine(2, {basis:["1", "e2", "e1", "e21"]});
      const R = A.inline(()=>1 + 2e1 + 3e2 + 4e12)();
      expect(R).toEqual(A.multivector(1, 3, 2, -4));
    })
   
    test('full custom layout via types', ()=>{
      const A = GAmphetamine(2, {types:[{name:'scalar',layout:["1"]}, {name:'multivector', layout:["1","e12","e2","e1"]}]});
      const R = A.inline(()=>1 + 2e1 + 3e2 + 4e12)();
      expect(R).toEqual(A.multivector(1, 4, 3, 2));
    })

  });

  /////////////////////////////////////////////////////////////////////////////
  // COMPILING ALL DEFAULT FUNCTIONS
  /////////////////////////////////////////////////////////////////////////////

  describe('Precompile all functions.', ()=>{ 

    test('ℝ₀', ()=>{
       const R0 = GAmphetamine({precompile:true});
       expect(R0.options.basis).toEqual(["1"]);
     });  

     test('ℝ₁', ()=>{
        const R1 = GAmphetamine(1,{precompile:true});
        expect(R1.options.basis).toEqual(["1","e1"]);
      });  

      test('ℝ₂', ()=>{
        const R2 = GAmphetamine(2,{precompile:true});
        expect(R2.options.basis).toEqual(["1","e1","e2","e12"]);
      });  

      test('ℝ₃', ()=>{
        const R3 = GAmphetamine(3,{precompile:true});
        expect(R3.options.basis.length).toEqual(2**3);
      });  

      test('ℝ₄', ()=>{
        const R4 = GAmphetamine(4,{precompile:true});
        expect(R4.options.basis.length).toEqual(2**4);
      });  

      test('ℝ₃₀₁', ()=>{
        const R301 = GAmphetamine(3,0,1,{precompile:true});
        expect(R301.options.basis.length).toEqual(2**4);
      });  
      
  });

  /////////////////////////////////////////////////////////////////////////////
  // FORMATTED OUTPUTS
  /////////////////////////////////////////////////////////////////////////////

  describe('toString', ()=>{ 
    
    test('supports printPrecision',()=>{
      const result = GAmphetamine("3DPGA", {printPrecision:5}, ()=>1.12345678e1 + '');      
      expect(result).toEqual("1.12346 e₁");
    });

    test('supports printFormat latex',()=>{
      const result = GAmphetamine("3DPGA", {printFormat:"latex"}, ()=>1.12345678e1 + '');      
      expect(result).toEqual("1.123\\mathbf e_{1}");
    });

  });

  /////////////////////////////////////////////////////////////////////////////
  // CUSTOM OPERATORS
  /////////////////////////////////////////////////////////////////////////////

  describe('custom operators', ()=>{

    test('custom operators at construction', ()=>{
      const A = GAmphetamine( "3DPGA", { methods : ({add,gp})=>({ dcp:(a,b)=>gp(add(a,b),[2])} )});
      const R = A.inline(()=>1e1.dcp(1e2))();
      expect(R).toEqual(A.vector(2, 2, 0, 0));
    })

    test('runtime adding of operators', ()=>{
      const A = GAmphetamine("3DPGA");
      const R = A.inline(()=>{
        Element.addMethod( (a,b)=>(a+b)*2, 'dcp' );
        return 1e1.dcp(1e2);
      })();
      expect(R).toEqual(A.vector(2, 2, 0, 0));
    });

    test('runtime binary operator', ()=>{
      const R = GAmphetamine( "3DPGA", ()=>{
        const commutator = (a,b)=> 0.5 * (a*b - b*a);
        const func = Element.compile(commutator, [Element.bivector(), Element.bivector()]);
        return func.toString();
      });
      expect(R).toEqual('function commutator_bivector_bivector (a,b,res=new classes.bivector()) {\n  const a0=a[0],a1=a[1],a2=a[2],a3=a[3],a4=a[4],a5=a[5],b0=b[0],b1=b[1],b2=b[2],b3=b[3],b4=b[4],b5=b[5];\n  res[0]=-a1*b3+a2*b4+a3*b1-a4*b2;\n  res[1]=a0*b3-a2*b5-a3*b0+a5*b2;\n  res[2]=-a0*b4+a1*b5+a4*b0-a5*b1;\n  res[3]=a4*b5-a5*b4;\n  res[4]=-a3*b5+a5*b3;\n  res[5]=a3*b4-a4*b3;\n  return res;\n}')
    })

    test('runtime unary operator', ()=>{
      const R = GAmphetamine( "3DPGA", ()=>{
        const commutator = (a)=> 0.5 * (a*a.dual() - a.dual()*a);
        const func = Element.compile(commutator, [Element.bivector()]);
        return func.toString();
      });
      expect(R).toEqual('function commutator_bivector (a,res=new classes.bivector()) {\n  const a0=a[0],a1=a[1],a2=a[2],a3=a[3],a4=a[4],a5=a[5];\n  res[3]=a0*a4-a1*a5;\n  res[4]=-a0*a3+a2*a5;\n  res[5]=a1*a3-a2*a4;\n  return res;\n}')
    })

    test('runtime n-ary operator', ()=>{
      const R = GAmphetamine( "3DPGA", ()=>{
        const join = (a,b,c)=> a & b & c;
        const func = Element.compile(join, [3,3,3]);
        return func.toString();
      });
      expect(R).toEqual('function join_trivector_trivector_trivector (a,b,c,res=new classes.vector()) {\n  const a0=a[0],a1=a[1],a2=a[2],a3=a[3],b0=b[0],b1=b[1],b2=b[2],b3=b[3],c0=c[0],c1=c[1],c2=c[2],c3=c[3],a1c3=a1*c3,a1c2=a1*c2,a2c3=a2*c3,a2c1=a2*c1,a3c2=a3*c2,a3c1=a3*c1,a0c3=a0*c3,a0c2=a0*c2,a2c0=a2*c0,a3c0=a3*c0,a0c1=a0*c1,a1c0=a1*c0;\n  res[0]=b1*(-a2c3+a3c2)+b2*(a1c3-a3c1)+b3*(-a1c2+a2c1);\n  res[1]=b0*(a2c3-a3c2)+b2*(-a0c3+a3c0)+b3*(a0c2-a2c0);\n  res[2]=b0*(-a1c3+a3c1)+b1*(a0c3-a3c0)+b3*(-a0c1+a1c0);\n  res[3]=b0*(a1c2-a2c1)+b1*(-a0c2+a2c0)+b2*(a0c1-a1c0);\n  return res;\n}')
    })

  }); 

  /////////////////////////////////////////////////////////////////////////////
  // SYMBOLIC CALCULATIONS
  /////////////////////////////////////////////////////////////////////////////

  describe('internal symbolic operations', ()=>{

    test('internal symbolic operations - gp_vec_vec',()=>{
      const R = GAmphetamine(3,()=>Element.vector('a') * Element.vector('b') + '');
      expect(R).toEqual("(a1*b1+a2*b2+a3*b3) + (a1*b2-a2*b1) e₁₂ + (a1*b3-a3*b1) e₁₃ + (a2*b3-a3*b2) e₂₃")
    })

    test('internal symbolic operations - dot_vec_biv',()=>{
      const R = GAmphetamine(3,()=>Element.vector('a') | Element.bivector('b') + '');
      expect(R).toEqual("(-a2*b1-a3*b2) e₁ + (a1*b1-a3*b3) e₂ + (a1*b2+a2*b3) e₃")
    })

  })

  var PGA = GAmphetamine("3DPGA");  
 
  /////////////////////////////////////////////////////////////////////////////
  // SANDWICH
  /////////////////////////////////////////////////////////////////////////////
  
  describe('Sandwich product signs.', ()=>{
    
    test('reflecting vector-self', () => {
      const result = PGA.inline(()=>1e1>>>1e1)();
      expect(result).toEqual(PGA.vector(-1, 0, 0, 0));
    });

    test('reflecting vector-vector', () => {
        const result = PGA.inline(()=>1e2>>>1e1)();
        expect(result).toEqual(PGA.vector(1, -0, 0, 0));
    });

    test('reflecting vector-bivector', () => {
        const result = PGA.inline(()=>1e1>>>1e12)();
        expect(result).toEqual(PGA.bivector(0, 0, 0, -1, 0, 0));
    });

    test('reflecting vector-trivector', () => {
        const result = PGA.inline(()=>1e1>>>1e123)();
        expect(result).toEqual(PGA.trivector(0, 0, 0, -1));
    });
    
  });

  /////////////////////////////////////////////////////////////////////////////
  // INVERSES
  /////////////////////////////////////////////////////////////////////////////

  describe('Inverses - 3DPGA', ()=>{

    test('symbolic - vector', ()=>{
      const R = GAmphetamine("3DPGA", ()=>Element.vector("b")*(Element.vector("b")).inverse() + '');
      expect(R).toEqual("1")
    });

    test('symbolic - bivector', ()=>{
      const R = GAmphetamine("3DPGA", ()=>Element.bivector("b")*(Element.bivector("b")).inverse() + '');
      expect(R).toEqual("1")
    });

    test('symbolic - trivector', ()=>{
      const R = GAmphetamine("3DPGA", ()=>Element.trivector("b")*(Element.trivector("b")).inverse() + '');
      expect(R).toEqual("1")
    });

    test('numerical - vector', ()=>{
      const R = GAmphetamine("3DPGA", ()=>Element.vector(1,2,3,4)*(Element.vector(1,2,3,4)).inverse() + '');
      expect(R).toEqual("1.000")
    });

    test('numerical - bivector', ()=>{
      const R = GAmphetamine("3DPGA", ()=>Element.bivector(1,2,3,4,5,6)*(Element.bivector(1,2,3,4,5,6)).inverse() + '');
      expect(R).toEqual("1.000")
    });

    test('numerical - trivector', ()=>{
      const R = GAmphetamine("3DPGA", ()=>Element.trivector(1,2,3,4)*(Element.trivector(1,2,3,4)).inverse() + '');
      expect(R).toEqual("1.000")
    });

    test('numerical - rotor', ()=>{
      const R = GAmphetamine("3DPGA", ()=>Element.rotor(1,2,3,4,5,6,7,8)*(Element.rotor(1,2,3,4,5,6,7,8)).inverse() + '');
      expect(R).toEqual("1.000")
    });

  });

  /////////////////////////////////////////////////////////////////////////////
  // INVARIANT FACTORISATION
  /////////////////////////////////////////////////////////////////////////////

  describe('Invariant Factorisation', ()=>{

    test ('3DPGA - bivector split', ()=>{
      const PGA = GAmphetamine("3DPGA");
      const R = PGA.inline(()=>(1e12+1e03).split())();
      expect(R[0]).toEqual(PGA.bivector([0,0,0,1,0,0]));
      expect(R[1]).toEqual(PGA.bivector([0,0,1,0,0,0]));
    });

    test ('3DPGA - invariant factorisation', ()=>{
      const PGA = GAmphetamine("3DPGA");
      const R = PGA.inline(()=>((1e12)*(1+1e03)).factorize())();
      expect(R[0]).toEqual(PGA.rotor([0,0,0,0,1,0,0,0]));
      expect(R[1]).toEqual(PGA.rotor([1,0,0,1,0,0,0,0]));
    });

  });


});
