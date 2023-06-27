// Import the module
import rationalPolynomial from '../src/rationalPolynomial';

// Tests
describe('rationalPolynomial', () => {

  /////////////////////////////////////////////////////////////////////////////
  // ADD
  /////////////////////////////////////////////////////////////////////////////

  describe('add', ()=>{
    test('add: same denominator', () => {
      const a = [[[1, 'x'], [2, 'y']], [[1, 'z']]];
      const b = [[[3, 'x'], [4, 'y']], [[1, 'z']]];
      const result = rationalPolynomial.add(a, b);
      expect(result).toEqual([[[4, 'x'], [6, 'y']], [[1, 'z']]]);
    });

    test('add: different denominators', () => {
      const a = [[[1, 'x'], [2, 'y']], [[1, 'z']]];
      const b = [[[3, 'x'], [4, 'y']], [[2, 'z']]];
      const result = rationalPolynomial.add(a, b);
      expect(result).toEqual([[[5, 'x', 'z'], [8, 'y', 'z']], [[2, 'z', 'z']]]);
    });

    test('add: with zero', () => {
      const a = [[[1, 'x'], [2, 'y']], [[1, 'z']]];
      const b = 0;
      const result = rationalPolynomial.add(a, b);
      expect(result).toEqual(a);
    });

    test('add: with negative coefficients', () => {
      const a = [[[-1, 'x'], [2, 'y']], [[1, 'z']]];
      const b = [[[1, 'x'], [-2, 'y']], [[1, 'z']]];
      const result = rationalPolynomial.add(a, b);
      expect(result).toEqual(0);
    });
  });

  /////////////////////////////////////////////////////////////////////////////
  // MUL
  /////////////////////////////////////////////////////////////////////////////

  describe('multiply', () => {
    test('mul: single variable polynomials', () => {
      const a = [[[1, 'x']], [[1]]];
      const b = [[[2, 'x']], [[1]]];
      const result = rationalPolynomial.mul(a, b);
      expect(result).toEqual([[[2, 'x', 'x']], [[1]]]);
    });

    test('mul: multi-variable polynomials', () => {
      const a = [[[1, 'x', 'y'], [2, 'z']], [[1]]];
      const b = [[[3, 'x', 'y'], [4, 'z']], [[1]]];
      const result = rationalPolynomial.mul(a, b);
      expect(result).toEqual([[[3, 'x', 'x', 'y', 'y'], [10, 'x', 'y', 'z'], [8, 'z', 'z']], [[1]]]);
    });

    test('mul: with zero polynomials', () => {
      const a = [[[1, 'x'], [2, 'y'], [3, 'z']], [[1]]];
      const b = 0;
      const result = rationalPolynomial.mul(a, b);
      expect(result).toEqual(0);
    });

    test('mul: with negative coefficients', () => {
      const a = [[[-1, 'x'], [2, 'y'], [-3, 'z']], [[1]]];
      const b = [[[1, 'x'], [-2, 'y'], [3, 'z']], [[1]]];
      const result = rationalPolynomial.mul(a, b);
      expect(result).toEqual([[[-1, 'x', 'x'], [4, 'x', 'y'], [-6, 'x', 'z'], [-4, 'y', 'y'], [12, 'y', 'z'], [-9, 'z', 'z']], [[1]]]);
    });
  });

  /////////////////////////////////////////////////////////////////////////////
  // INV
  /////////////////////////////////////////////////////////////////////////////

  describe('inverse', () => {
    test('inv: single variable polynomial', () => {
      const a = [[[1, 'x']], [[1]]];
      const result = rationalPolynomial.inv(a);
      expect(result).toEqual([[[1]], [[1, 'x']]]);
    });

    test('inv: multi-variable polynomial', () => {
      const a = [[[1, 'x', 'y'], [2, 'z']], [[1]]];
      const result = rationalPolynomial.inv(a);
      expect(result).toEqual([[[1]], [[1, 'x', 'y'], [2, 'z']]]);
    });

    test('inv: with negative coefficients', () => {
      const a = [[[-1, 'x'], [2, 'y'], [-3, 'z']], [[1]]];
      const result = rationalPolynomial.inv(a);
      expect(result).toEqual([[[1]], [[-1, 'x'], [2, 'y'], [-3, 'z']]]);
    });

    test('inv: polynomial times its own inverse equals one A', () => {
      const a = [[[1, 'x']], [[1]]];
      const invA = rationalPolynomial.inv(a);
      const result = rationalPolynomial.mul(a, invA);
      expect(result).toEqual(1);
    });

    test('inv: polynomial times its own inverse equals one B', () => {
      const a = [[[1, 'x','x'],[2, 'x', 'y'], [3, 'y', 'y', 'y']], [[1]]];
      const invA = rationalPolynomial.inv(a);
      const result = rationalPolynomial.mul(a, invA);
      expect(result).toEqual(1);
    });

    for (var batch=0; batch<30; batch++) {
      let sum = 0;
      for (var i=0, l=Math.random()*8|0+1; i<l; ++i) {
          const factor = ['a','b','c','d','e'][Math.random()*5|0];
          sum = rationalPolynomial.mul( rationalPolynomial.mul(Math.random()*4|0+1,factor), rationalPolynomial.add(sum, factor));
      }
      test('inv: polynomial times its own inverse - random batch ['+rationalPolynomial.format(sum, false)+']', () => {
          const invSum = rationalPolynomial.inv(sum);
          const result = rationalPolynomial.mul(sum, invSum);
          expect(result).toEqual(1);
      })
    }
  });  
});