// Import the module
import GAmphetamine from '../src/GAmphetamine';

// Compare arrays to be close
expect.extend({toBeCloseArray : function toBeCloseArray(actual,ref){
    for (var pass=ref.length===actual.length, i=0; i<ref.length; ++i) if (Math.abs(actual[i]-ref[i])>0.00001) { pass=false; break; }
    return ({ message: () => `expected ${this.utils.printReceived(actual)} close to ${this.utils.printExpected(ref)} [fails at index ${i}]`, pass })
}});

// Tests
describe('3D PGA', () => {

  var PGA = GAmphetamine("3DPGA");

  /////////////////////////////////////////////////////////////////////////////
  // BASIC TESTS
  /////////////////////////////////////////////////////////////////////////////
  describe('basic', ()=>{ 

    test('outer product of vectors produces a bivector', ()=>{
       const R = PGA.inline(()=>1e1^1e2)();
       expect(R).toEqual(PGA.bivector(0,0,0,1,0,0));
    });  

    test('geometric product of vectors produces an even', ()=>{
      const R = PGA.inline(()=>1e1*1e2)();
      expect(R).toEqual(PGA.even(0,0,0,0,1,0,0,0));
    });  

    test('inner product of vectors produces a scalar', ()=>{
      const R = PGA.inline(()=>1e1|1e1)();
      expect(R).toEqual(1);
    });  

  });

  /////////////////////////////////////////////////////////////////////////////
  // NORMALISATION
  /////////////////////////////////////////////////////////////////////////////
  describe('normalize', ()=>{ 

    test('Random bivector', ()=>{
      for (var i=0; i<50; ++i) {
        const R = PGA.inline(()=>{ 
          var B  = Element.bivector(...[...Array(6)].map(x=>Math.random()*2-1)).normalized();
          return B * ~B;
        })();
        expect(R).toBeCloseArray([1,0,0,0,0,0,0,0]);
      }
    })

    test('Random rotor', ()=>{
      for (var i=0; i<50; ++i) {
        const R = PGA.inline(()=>{ 
          var R  = Element.even(...[...Array(8)].map(x=>Math.random()*2-1)).normalized();
          return R * ~R;
        })();
        expect(R).toBeCloseArray([1,0,0,0,0,0,0,0]);
      }
    })

  });

  /////////////////////////////////////////////////////////////////////////////
  // EXP
  /////////////////////////////////////////////////////////////////////////////
  describe('exp', ()=>{ 

    test('Exponential of euclidean bivector', ()=>{
       const R = PGA.inline(()=> Math.E ** (Math.PI/2 * 1e12) )();
       expect(R).toBeCloseArray(PGA.even(0,0,0,0,1,0,0,0));
     });  

     test('Exponential of ideal bivector', ()=>{
      const R = PGA.inline(()=> Math.E ** (1e01) )();
      expect(R).toBeCloseArray(PGA.even(1,1,0,0,0,0,0,0));
    });  

    test('Exponential of screw axis', ()=>{
      const R = PGA.inline(()=> Math.E**(1e01+Math.PI/2*1e23) ).apply(PGA);
      expect(R).toBeCloseArray(PGA.even(0,0,0,0,0,0,1,1));
    })

    test('Random exp -> log', ()=>{
      for (var i=0; i<50; ++i) {
        const R = PGA.inline(()=>{ 
          // Get a random bivector and exponentiate it.
          var B  = Element.bivector(...[...Array(6)].map(x=>Math.random()*2-1));
          var R  = Math.E ** B;
          // Now take the log of the rotor and re-exponentiate to get the same rotor
          var C  = R.log();
          var R2 = Math.E ** C;
          // Make sure R and R2 are the same. (B & C do NOT have to be!)
          return [R,R2];
        })();
        expect(R[0]).toBeCloseArray(R[1]);
      }
    })

  });

  /////////////////////////////////////////////////////////////////////////////
  // Inverses
  /////////////////////////////////////////////////////////////////////////////
  describe('inverses', ()=>{ 

    test('Inverse of vector', ()=>{
      const R = PGA.inline(()=>{
        const V = 1e0 + 2e1 + 3e2 + 4e3;
        const VI = V**-1;
        return V * VI; 
      })();
      expect(R).toBeCloseArray(PGA.even(1,0,0,0,0,0,0,0));
    });  

    test('Inverse of non-simple bivector', ()=>{
       const R = PGA.inline(()=>{
         const B = 1e01 + 2e02 + 3e03 + 4e12 + 5e31 + 6e23;
         const BI = B**-1;
         return B * BI; 
       })();
       expect(R).toBeCloseArray(PGA.even(1,0,0,0,0,0,0,0));
     });  

    test('Inverse of trivector', ()=>{
      const R = PGA.inline(()=>{
        const T = !(1e0 + 2e1 + 3e2 + 4e3);
        const TI = T**-1;
        return T * TI; 
      })();
      expect(R).toBeCloseArray(PGA.even(1,0,0,0,0,0,0,0));
    });  

    test('Inverse of rotor', ()=>{
      const R = PGA.inline(()=>{
        const R = Math.E ** (1e01 + 2e02 + 3e03 + 4e12 + 5e31 + 6e23);
        const RI = R**-1;
        return R * RI; 
      })();
      expect(R).toBeCloseArray(PGA.even(1,0,0,0,0,0,0,0));
    });  

  });

});
