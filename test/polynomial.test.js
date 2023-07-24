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
      expect(result).toEqual([["xx=x*x"],[[["y","xx",[[2],[1,"y"]]]],[[3,"xx","y","y"]]]]);
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
      expect(result).toEqual( [[],[[["x",[[2,"y","y"],[3,"z"]]]],[["x",[[3,"x"],[2,"w","z"]]]]]] );
    });

    test('cse: isolate constants.', () => {
      const poly1 = [[2, 'x'], [-2, 'z']];
      const poly2 = [[3, 'x', 'x'], [3, 'w','z','z']];
      console.log( polynomial.format(poly1) );
      debugger
      const result = polynomial.cse([poly1, poly2],['x']);
      console.log( polynomial.format(result[1][0]) );
      console.log(JSON.stringify(result));
      expect(result).toEqual([["wz=w*z"], [[[2, [["x"], [-1, "z"]]]], [[3, "x", "x"], [3, "wz", "z"]]]]);
    });


  });
  
});
