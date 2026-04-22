// Import the module
import polynomial from '../src/polynomial';

// Tests
describe('polynomial', () => {

  /////////////////////////////////////////////////////////////////////////////
  // COMPARE
  /////////////////////////////////////////////////////////////////////////////
  
  describe('comparison', ()=>{
    test('compare: equal polynomials', () => {
      const a = [[1, 'x'], [2, 'y'], [3, 'z']];
      const b = [[1, 'x'], [2, 'y'], [3, 'z']];
      const result = polynomial.compare(a, b);
      expect(result).toEqual(0);
    });

    test('compare: a < b', () => {
      const a = [[1, 'x'], [2, 'y'], [3, 'z']];
      const b = [[1, 'x'], [2, 'y'], [4, 'z']];
      const result = polynomial.compare(a, b);
      expect(result).toEqual(-1);
    });

    test('compare: a > b', () => {
      const a = [[1, 'x'], [2, 'y'], [4, 'z']];
      const b = [[1, 'x'], [2, 'y'], [3, 'z']];
      const result = polynomial.compare(a, b);
      expect(result).toEqual(1);
    });

    test('compare: with undefined b', () => {
      const a = [[1, 'x'], [2, 'y'], [3, 'z']];
      const b = undefined;
      const result = polynomial.compare(a, b);
      expect(result).toEqual(-1);
    });

    test('compare: with undefined a', () => {
      const a = undefined;
      const b = [[1, 'x'], [2, 'y'], [3, 'z']];
      const result = polynomial.compare(a, b);
      expect(result).toEqual(1);
    });

    test('compare: with both undefined', () => {
      const a = undefined;
      const b = undefined;
      const result = polynomial.compare(a, b);
      expect(result).toEqual(1);
    });
  });

  /////////////////////////////////////////////////////////////////////////////
  // ADD
  /////////////////////////////////////////////////////////////////////////////
  
  describe('addition', ()=>{
    test('add: single variable polynomials', () => {
      const a = [[1, 'x']];
      const b = [[2, 'x']];
      const result = polynomial.add(a, b);
      expect(result).toEqual([[3, 'x']]);
    });

    test('add: multi-variable polynomials', () => {
      const a = [[1, 'x', 'y'], [2, 'z']];
      const b = [[3, 'x', 'y'], [4, 'z']];
      const result = polynomial.add(a, b);
      expect(result).toEqual([[4, 'x', 'y'], [6, 'z']]);
    });

    test('add: maintaining sort order', () => {
      const a = [[1, 'x'], [2, 'y'], [3, 'z']];
      const b = [[4, 'x'], [5, 'y'], [6, 'z']];
      const result = polynomial.add(a, b);
      expect(result).toEqual([[5, 'x'], [7, 'y'], [9, 'z']]);
    });

    test('add: with zero polynomials', () => {
      const a = [[1, 'x'], [2, 'y'], [3, 'z']];
      const b = 0;
      const result = polynomial.add(a, b);
      expect(result).toEqual(a);
    });

    test('add: with negative coefficients', () => {
      const a = [[1, 'x'], [-2, 'y'], [3, 'z']];
      const b = [[-1, 'x'], [2, 'y'], [-3, 'z']];
      const result = polynomial.add(a, b);
      expect(result).toEqual(0);
    });
  });

  /////////////////////////////////////////////////////////////////////////////
  // MUL
  /////////////////////////////////////////////////////////////////////////////

  describe('multiply', ()=>{
    test('mul: single variable polynomials', () => {
      const a = [[1, 'x']];
      const b = [[2, 'x']];
      const result = polynomial.mul(a, b);
      expect(result).toEqual([[2, 'x', 'x']]);
    });

    test('mul: multi-variable polynomials', () => {
      const a = [[1, 'x', 'y'], [2, 'z']];
      const b = [[3, 'x', 'y'], [4, 'z']];
      const result = polynomial.mul(a, b);
      expect(result).toEqual([[3, 'x', 'x', 'y', 'y'], [10, 'x', 'y', 'z'], [8, 'z', 'z']]);
    });

    test('mul: with zero polynomials', () => {
      const a = [[1, 'x'], [2, 'y'], [3, 'z']];
      const b = 0;
      const result = polynomial.mul(a, b);
      expect(result).toEqual(0);
    });

    test('mul: with negative coefficients', () => {
      const a = [[1, 'x'], [-2, 'y'], [3, 'z']];
      const b = [[-1, 'x'], [2, 'y'], [-3, 'z']];
      const result = polynomial.mul(a, b);
      expect(result).toEqual([[-1, 'x', 'x'], [4, 'x', 'y'], [-6, 'x', 'z'],[-4, 'y', 'y'], [12, 'y', 'z'], [-9, 'z', 'z']]);
    });
  });

  /////////////////////////////////////////////////////////////////////////////
  // NEG
  /////////////////////////////////////////////////////////////////////////////

  describe('negation', ()=>{
    test('neg: single variable polynomial', () => {
      const a = [[1, 'x']];
      const result = polynomial.neg(a);
      expect(result).toEqual([[-1, 'x']]);
    });

    test('neg: multi-variable polynomial', () => {
      const a = [[1, 'x', 'y'], [2, 'z']];
      const result = polynomial.neg(a);
      expect(result).toEqual([[-1, 'x', 'y'], [-2, 'z']]);
    });

    test('neg: with zero polynomial', () => {
      const a = 0;
      const result = polynomial.neg(a);
      expect(result).toEqual(0);
    });

    test('neg: with negative coefficients', () => {
      const a = [[-1, 'x'], [2, 'y'], [-3, 'z']];
      const result = polynomial.neg(a);
      expect(result).toEqual([[1, 'x'], [-2, 'y'], [3, 'z']]);
    });
  });

  /////////////////////////////////////////////////////////////////////////////
  // CSE
  /////////////////////////////////////////////////////////////////////////////

  describe('common subexpression elimination', ()=>{
    test('cse: single repetition across polynomials', () => {
      const poly1 = [[2, 'x', 'x']];
      const poly2 = [[3, 'x', 'x']];
      const result = polynomial.cse([poly1, poly2]);
      expect(result).toEqual([['xx=x*x'], [[[2, 'xx']], [[3, 'xx']]]]);
    });

    test('cse: single repetition across polynomials', () => {
      const poly1 = [[2, 'x', 'x', 'x']];
      const poly2 = [[3, 'x', 'x', 'y']];
      const result = polynomial.cse([poly1, poly2]);
      expect(result).toEqual([['xx=x*x'], [[[2, 'xx', 'x']], [[3, 'xx', 'y']]]]);
    });

    test('cse: isolate across polynomials.', () => {
      const poly1 = [[2, 'x', 'x', 'y'],[1, 'x', 'x', 'y','y']];
      const poly2 = [[3, 'x', 'x', 'y', 'y']];
      const result = polynomial.cse([poly1, poly2],['y']);
      expect(result).toEqual([[],[[[1,"x","y",[[2,"x"],[1,"x","y"]]]],[[3,"x","x","y","y"]]]]);
    });

    test('cse: single repetition across mixed polynomials', () => {
      const poly1 = [[2, 'x', 'x'], [3, 'x', 'x', 'y']];
      const poly2 = [[3, 'x', 'x'], [2, 'y', 'y']];
      const result = polynomial.cse([poly1, poly2]);
      expect(result).toEqual([["xx=x*x"], [[[2, "xx"], [3, "xx", "y"]], [[3, "xx"], [2, "y", "y"]]]]);
    });

    test('cse: multi repetition across mixed polynomials', () => {
      const poly1 = [[2, 'x', 'x', 'y'], [3, 'z', 'z']];
      const poly2 = [[3, 'x', 'x'], [2, 'w','z','z']];
      const result = polynomial.cse([poly1, poly2]);
      expect(result).toEqual([["xx=x*x", "zz=z*z"], [[[2, "xx", "y"], [3, "zz"]], [[3, "xx"], [2, "w", "zz"]]]]);
    });

    test('cse: variable protection', () => {
      const poly1 = [[2, 'x', 'x', 'y'], [3, 'z', 'z']];
      const poly2 = [[3, 'x', 'x'], [2, 'w','z','z']];
      const result = polynomial.cse([poly1, poly2],['x']);
      expect(result).toEqual([["zz=z*z"], [[[2, "x", "x", "y"], [3, "zz"]], [[3, "x", "x"], [2, "w", "zz"]]]]);
    });

    test('cse: variable protect and isolate', () => {
      const poly1 = [[2, 'x', 'y', 'y'], [3, 'x', 'z']];
      const poly2 = [[3, 'x', 'x'], [2, 'w','x','z']];
      const result = polynomial.cse([poly1, poly2],['x']);
      expect(result).toEqual( [[],[[[1,"x",[[2,"y","y"],[3,"z"]]]],[[1,"x",[[3,"x"],[2,"w","z"]]]]]] );
    });

    test('cse: isolate constants.', () => {
      const poly1 = [[2, 'x'], [-2, 'z']];
      const poly2 = [[3, 'x', 'x'], [3, 'w','z','z']];
      const result = polynomial.cse([poly1, poly2],['x']);
      expect(result).toEqual([[],[[[2,"x"],[-2,"z"]],[[3,"x","x"],[3,"w","z","z"]]]]);
    });

    test('cse: 4-point join determinant merges via group-merge phase', () => {
      // det[1,a;1,b;1,c;1,d] expanded: 24 monomials, polynomial in (a,b,c,d) ∈ R³⁴.
      // The merge phase exploits the polynomial identity Σ v2_k · P1_k = ±Σ v2_k · P2_k
      // (cross terms cancel as scalar-triple-product anti-symmetry) to fold two
      // isolation slots into a single one with a (v1±v2) outer factor.
      const poly = [
        [ 1, 'b0', 'c1', 'd2'], [-1, 'b0', 'c2', 'd1'],
        [-1, 'b1', 'c0', 'd2'], [ 1, 'b1', 'c2', 'd0'],
        [ 1, 'b2', 'c0', 'd1'], [-1, 'b2', 'c1', 'd0'],
        [-1, 'a0', 'c1', 'd2'], [ 1, 'a0', 'c2', 'd1'],
        [ 1, 'a1', 'c0', 'd2'], [-1, 'a1', 'c2', 'd0'],
        [-1, 'a2', 'c0', 'd1'], [ 1, 'a2', 'c1', 'd0'],
        [ 1, 'a0', 'b1', 'd2'], [-1, 'a0', 'b2', 'd1'],
        [-1, 'a1', 'b0', 'd2'], [ 1, 'a1', 'b2', 'd0'],
        [ 1, 'a2', 'b0', 'd1'], [-1, 'a2', 'b1', 'd0'],
        [-1, 'a0', 'b1', 'c2'], [ 1, 'a0', 'b2', 'c1'],
        [ 1, 'a1', 'b0', 'c2'], [-1, 'a1', 'b2', 'c0'],
        [-1, 'a2', 'b0', 'c1'], [ 1, 'a2', 'b1', 'c0'],
      ];
      const iso = ['a0','a1','a2','b0','b1','b2','c0','c1','c2','d0','d1','d2'];
      const [prelude, expr] = polynomial.cse([poly], [], iso);

      // Merge phase introduces three (d−c) sum vars, collapsing 24 monomials into
      // three nested terms.
      expect(prelude).toEqual(['_e0=d0-c0', '_e1=d1-c1', '_e2=d2-c2']);
      expect(expr.length).toEqual(1);
      expect(expr[0].length).toEqual(3);
      expect(expr[0].every(t => t.length === 3 && t[1].startsWith('_e') && t[2] instanceof Array)).toBe(true);

      // Numerical equivalence: evaluate cse output and original at random vectors.
      const env = { a0: 1.1, a1: 1.7, a2: 2.3, b0: 0.5, b1: -1.3, b2: 2.1,
                    c0: 0.9, c1: 1.5, c2: -0.7, d0: -2.1, d1: 0.3, d2: 1.9,
                    _e0: 0, _e1: 0, _e2: 0 };
      env._e0 = env.d0 - env.c0; env._e1 = env.d1 - env.c1; env._e2 = env.d2 - env.c2;
      const evalPoly = (p) => p.reduce((s, t) => {
        let v = t[0];
        for (let i = 1; i < t.length; i++) {
          v *= (t[i] instanceof Array) ? evalPoly(t[i]) : env[t[i]];
        }
        return s + v;
      }, 0);
      expect(evalPoly(expr[0])).toBeCloseTo(evalPoly(poly), 10);
    });


  });

});
