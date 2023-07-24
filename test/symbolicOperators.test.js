// Import the module
import rationalPolynomial from '../src/rationalPolynomial';
import symbolicOperators from '../src/symbolicOperators';

// Setup the test environment.
var options = {
  basis  : ["1","e1","e2","e3","e12","e13","e23","e123"],
  Cayley : [[[1,0],[1,1],[1,2],[1,3],[1,4],[1,5],[1,6],[1,7]],[[1,1],[1,0],[1,4],[1,5],[1,2],[1,3],[1,7],[1,6]],[[1,2],[-1,4],[1,0],[1,6],[-1,1],[-1,7],[1,3],[-1,5]],[[1,3],[-1,5],[-1,6],[1,0],[1,7],[-1,1],[-1,2],[1,4]],[[1,4],[-1,2],[1,1],[1,7],[-1,0],[-1,6],[1,5],[-1,3]],[[1,5],[-1,3],[-1,7],[1,1],[1,6],[-1,0],[-1,4],[1,2]],[[1,6],[1,7],[-1,3],[1,2],[-1,5],[1,4],[-1,0],[-1,1]],[[1,7],[1,6],[-1,5],[1,4],[-1,3],[1,2],[-1,1],[-1,0]]],
  n      : 3,
  p      : 3,
  q      : 0,
  r      : 0,
  types  : [
    {name:"scalar",layout:["1"]},
    {name:"vector",layout:["e1","e2","e3"]},
    {name:"bivector",layout:["e12","e13","e23"]},
    {name:"trivector",layout:["e123"]},
    {name:"study",layout:["1","e123"]},
    {name:"rotor",layout:["1","e12","e13","e23"]},
    {name:"multivector",layout:["1","e1","e2","e3","e12","e13","e23","e123"]}
  ],
  nbHash : {"1":0,"e1":1,"e2":2,"e3":3,"e12":4,"e13":5,"e23":6,"e123":7},
  grades : [0,1,1,1,2,2,2,3],
  dualBasis : [[1,7],[1,6],[-1,5],[1,4],[1,3],[-1,2],[1,1],[1,0]],
}

// Now grab all operators.
const coefficient = rationalPolynomial;
const contract    = ()=>console.error('custom contract should not be needed in this test!');
const allOperators = symbolicOperators(coefficient, options, contract);
const {gp, ip, lip, rip, op, dual, undual, reverse, involute, customInvolute, conjugate, add, sub, inv, abs, sqrt, grade, gradeOf, create, type} = allOperators;

// Tests
describe('symbolicOperators R3', () => {

  /////////////////////////////////////////////////////////////////////////////
  // VECTOR / VECTOR
  /////////////////////////////////////////////////////////////////////////////

  describe('vector-vector', () => {
    test('add: two vectors', () => {
        const a = create("vector", ["a","b","c"]);
        const b = create("vector", ["d","e","f"]);
        const result = add(a,b).map(x=>coefficient.format(x));
        expect(result).toEqual( [0,"a+d","b+e","c+f",0,0,0,0] );
    });

    test('subtract: two vectors', () => {
        const a = create("vector", ["a","b","c"]);
        const b = create("vector", ["d","e","f"]);
        const result = sub(a,b).map(x=>coefficient.format(x));
        expect(result).toEqual( [0,"a-d","b-e","c-f",0,0,0,0] );
    });

    test('ip: two vectors', () => {
        const a = create("vector", ["a","b","c"]);
        const b = create("vector", ["d","e","f"]);
        const result = ip(a,b).map(x=>coefficient.format(x));
        expect(result).toEqual( ["a*d+b*e+c*f",0,0,0,0,0,0,0] );
    });

    test('lip: two vectors', () => {
        const a = create("vector", ["a","b","c"]);
        const b = create("vector", ["d","e","f"]);
        const result = lip(a,b).map(x=>coefficient.format(x));
        expect(result).toEqual( ["a*d+b*e+c*f",0,0,0,0,0,0,0] );
    });

    test('rip: two vectors', () => {
        const a = create("vector", ["a","b","c"]);
        const b = create("vector", ["d","e","f"]);
        const result = rip(a,b).map(x=>coefficient.format(x));
        expect(result).toEqual( ["a*d+b*e+c*f",0,0,0,0,0,0,0] );
    });

    test('op: two vectors', () => {
        const a = create("vector", ["a","b","c"]);
        const b = create("vector", ["d","e","f"]);
        const result = op(a,b).map(x=>coefficient.format(x));
        expect(result).toEqual(  [0,0,0,0,"a*e-b*d","a*f-c*d","b*f-c*e",0] );
    });

    test('gp: two vectors', () => {
        const a = create("vector", ["a","b","c"]);
        const b = create("vector", ["d","e","f"]);
        const result = gp(a,b).map(x=>coefficient.format(x));
        expect(result).toEqual(  ["a*d+b*e+c*f",0,0,0,"a*e-b*d","a*f-c*d","b*f-c*e",0] );
    });

    test('reverse: vector', () => {
        const a = create("vector", ["a","b","c"]);
        const result = reverse(a).map(x=>coefficient.format(x));
        expect(result).toEqual( [0,"a","b","c",0,0,0,0] );
    });

    test('involute: vector', () => {
        const a = create("vector", ["a","b","c"]);
        const result = involute(a).map(x=>coefficient.format(x));
        expect(result).toEqual( [0,"-a","-b","-c",0,0,0,0] );
    });

    test('conjugate: vector', () => {
        const a = create("vector", ["a","b","c"]);
        const result = conjugate(a).map(x=>coefficient.format(x));
        expect(result).toEqual( [0,"-a","-b","-c",0,0,0,0] );
    });

    test('dual: vector', () => {
        const a = create("vector", ["a","b","c"]);
        const result = dual(a).map(x=>coefficient.format(x));
        expect(result).toEqual( [0,0,0,0,"c","-b","a",0] );
    });

    test('undual: vector', () => {
        const a = create("vector", ["a","b","c"]);
        const result = undual(a).map(x=>coefficient.format(x));
        expect(result).toEqual( [0,0,0,0,"c","-b","a",0] );
    });

    test('inv: scalar', () => {
        const a = create("multivector", ["a",0,0,0,0,0,0,0]);
        const result = inv(a).map(x=>coefficient.format(x));
        expect(result).toEqual( ["(1)/(a)",0,0,0,0,0,0,0] );
    });
  });

  /////////////////////////////////////////////////////////////////////////////
  // BIVECTOR / BIVECTOR
  /////////////////////////////////////////////////////////////////////////////

  describe('bivector-bivector', () => {
    test('add: two bivectors', () => {
        const a = create("bivector", ["a","b","c"]);
        const b = create("bivector", ["d","e","f"]);
        const result = add(a,b).map(x=>coefficient.format(x));
        expect(result).toEqual( [0,0,0,0,"a+d","b+e","c+f",0] );
    });

    test('subtract: two bivectors', () => {
        const a = create("bivector", ["a","b","c"]);
        const b = create("bivector", ["d","e","f"]);
        const result = sub(a,b).map(x=>coefficient.format(x));
        expect(result).toEqual( [0,0,0,0,"a-d","b-e","c-f",0] );
    });

    test('ip: two bivectors', () => {
        const a = create("bivector", ["a","b","c"]);
        const b = create("bivector", ["d","e","f"]);
        const result = ip(a,b).map(x=>coefficient.format(x));
        expect(result).toEqual( ["-a*d-b*e-c*f",0,0,0,0,0,0,0] );
    });

    test('lip: two bivectors', () => {
        const a = create("bivector", ["a","b","c"]);
        const b = create("bivector", ["d","e","f"]);
        const result = lip(a,b).map(x=>coefficient.format(x));
        expect(result).toEqual( ["-a*d-b*e-c*f",0,0,0,0,0,0,0] );
    });

    test('rip: two bivectors', () => {
        const a = create("bivector", ["a","b","c"]);
        const b = create("bivector", ["d","e","f"]);
        const result = rip(a,b).map(x=>coefficient.format(x));
        expect(result).toEqual( ["-a*d-b*e-c*f",0,0,0,0,0,0,0] );
    });

    test('op: two bivectors', () => {
        const a = create("bivector", ["a","b","c"]);
        const b = create("bivector", ["d","e","f"]);
        const result = op(a,b).map(x=>coefficient.format(x));
        expect(result).toEqual( [0,0,0,0,0,0,0,0] );
    });

    test('gp: two bivectors', () => {
        const a = create("bivector", ["a","b","c"]);
        const b = create("bivector", ["d","e","f"]);
        const result = gp(a,b).map(x=>coefficient.format(x));
        expect(result).toEqual( ["-a*d-b*e-c*f",0,0,0,"-b*f+c*e","a*f-c*d","-a*e+b*d",0] );
    });

    test('reverse: bivector', () => {
        const a = create("bivector", ["a","b","c"]);
        const result = reverse(a).map(x=>coefficient.format(x));
        expect(result).toEqual( [0,0,0,0,"-a","-b","-c",0] );
    });

    test('involute: bivector', () => {
        const a = create("bivector", ["a","b","c"]);
        const result = involute(a).map(x=>coefficient.format(x));
        expect(result).toEqual( [0,0,0,0,"a","b","c",0] );
    });

    test('conjugate: bivector', () => {
        const a = create("bivector", ["a","b","c"]);
        const result = conjugate(a).map(x=>coefficient.format(x));
        expect(result).toEqual( [0,0,0,0,"-a","-b","-c",0] );
    });
  });

  /////////////////////////////////////////////////////////////////////////////
  // VECTOR / BIVECTOR
  /////////////////////////////////////////////////////////////////////////////

  describe('vector-bivector', () => {
    test('add: vector and bivector', () => {
        const a = create("vector", ["a","b","c"]);
        const b = create("bivector", ["d","e","f"]);
        const result = add(a,b).map(x=>coefficient.format(x));
        expect(result).toEqual( [0,"a","b","c","d","e","f",0] );
    });

    test('subtract: vector and bivector', () => {
        const a = create("vector", ["a","b","c"]);
        const b = create("bivector", ["d","e","f"]);
        const result = sub(a,b).map(x=>coefficient.format(x));
        expect(result).toEqual( [0,"a","b","c","-d","-e","-f",0] );
    });

    test('ip: vector and bivector', () => {
        const a = create("vector", ["a","b","c"]);
        const b = create("bivector", ["d","e","f"]);
        const result = ip(a,b).map(x=>coefficient.format(x));
        expect(result).toEqual( [0,"-b*d-c*e","a*d-c*f","a*e+b*f",0,0,0,0] );
    });

    test('lip: vector and bivector', () => {
        const a = create("vector", ["a","b","c"]);
        const b = create("bivector", ["d","e","f"]);
        const result = lip(a,b).map(x=>coefficient.format(x));
        expect(result).toEqual( [0,"-b*d-c*e","a*d-c*f","a*e+b*f",0,0,0,0] );
    });

    test('rip: vector and bivector', () => {
        const a = create("vector", ["a","b","c"]);
        const b = create("bivector", ["d","e","f"]);
        const result = rip(a,b).map(x=>coefficient.format(x));
        expect(result).toEqual( [0,0,0,0,0,0,0,0] );
    });

    test('op: vector and bivector', () => {
        const a = create("vector", ["a","b","c"]);
        const b = create("bivector", ["d","e","f"]);
        const result = op(a,b).map(x=>coefficient.format(x));
        expect(result).toEqual( [0,0,0,0,0,0,0,"a*f-b*e+c*d"] );
    });

    test('gp: vector and bivector', () => {
        const a = create("vector", ["a","b","c"]);
        const b = create("bivector", ["d","e","f"]);
        const result = gp(a,b).map(x=>coefficient.format(x));
        expect(result).toEqual( [0,"-b*d-c*e","a*d-c*f","a*e+b*f",0,0,0,"a*f-b*e+c*d"] );
    });
  });

  /////////////////////////////////////////////////////////////////////////////
  // MULTIVECTOR / MULTIVECTOR
  /////////////////////////////////////////////////////////////////////////////
  
  describe('multivector-multivector', () => {
    test('add: two multivectors', () => {
        const a = create("multivector", ["a","b","c","d","e","f","g","h"]);
        const b = create("multivector", ["i","j","k","l","m","n","o","p"]);
        const result = add(a,b).map(x=>coefficient.format(x));
        expect(result).toEqual(  ["a+i","b+j","c+k","d+l","e+m","f+n","g+o","h+p"] );
    });

    test('subtract: two multivectors', () => {
        const a = create("multivector", ["a","b","c","d","e","f","g","h"]);
        const b = create("multivector", ["i","j","k","l","m","n","o","p"]);
        const result = sub(a,b).map(x=>coefficient.format(x));
        expect(result).toEqual( ["a-i","b-j","c-k","d-l","e-m","f-n","g-o","h-p"] );
    });

    test('ip: two multivectors', () => {
        const a = create("multivector", ["a","b","c","d","e","f","g","h"]);
        const b = create("multivector", ["i","j","k","l","m","n","o","p"]);
        const result = ip(a,b).map(x=>coefficient.format(x));
        expect(result).toEqual( ["a*i+b*j+c*k+d*l-e*m-f*n-g*o-h*p","a*j+b*i-c*m-d*n+e*k+f*l-g*p-h*o","a*k+b*m+c*i-d*o-e*j+f*p+g*l+h*n","a*l+b*n+c*o+d*i-e*p-f*j-g*k-h*m","a*m+d*p+e*i+h*l","a*n-c*p+f*i-h*k","a*o+b*p+g*i+h*j","a*p+h*i"] );
    });

    test('lip: two multivectors', () => {
        const a = create("multivector", ["a","b","c","d","e","f","g","h"]);
        const b = create("multivector", ["i","j","k","l","m","n","o","p"]);
        const result = lip(a,b).map(x=>coefficient.format(x));
        expect(result).toEqual( ["a*i+b*j+c*k+d*l-e*m-f*n-g*o-h*p","a*j-c*m-d*n-g*p","a*k+b*m-d*o+f*p","a*l+b*n+c*o-e*p","a*m+d*p","a*n-c*p","a*o+b*p","a*p"] );
    });

    test('rip: two multivectors', () => {
        const a = create("multivector", ["a","b","c","d","e","f","g","h"]);
        const b = create("multivector", ["i","j","k","l","m","n","o","p"]);
        const result = rip(a,b).map(x=>coefficient.format(x));
        expect(result).toEqual( ["a*i+b*j+c*k+d*l-e*m-f*n-g*o-h*p","b*i+e*k+f*l-h*o","c*i-e*j+g*l+h*n","d*i-f*j-g*k-h*m","e*i+h*l","f*i-h*k","g*i+h*j","h*i"] );
    });

    test('op: two multivectors', () => {
        const a = create("multivector", ["a","b","c","d","e","f","g","h"]);
        const b = create("multivector", ["i","j","k","l","m","n","o","p"]);
        const result = op(a,b).map(x=>coefficient.format(x));
        expect(result).toEqual( ["a*i","a*j+b*i","a*k+c*i","a*l+d*i","a*m+b*k-c*j+e*i","a*n+b*l-d*j+f*i","a*o+c*l-d*k+g*i","a*p+b*o-c*n+d*m+e*l-f*k+g*j+h*i"] );
    });

    test('gp: two multivectors', () => {
        const a = create("multivector", ["a","b","c","d","e","f","g","h"]);
        const b = create("multivector", ["i","j","k","l","m","n","o","p"]);
        const result = gp(a,b).map(x=>coefficient.format(x));
        expect(result).toEqual( ["a*i+b*j+c*k+d*l-e*m-f*n-g*o-h*p","a*j+b*i-c*m-d*n+e*k+f*l-g*p-h*o","a*k+b*m+c*i-d*o-e*j+f*p+g*l+h*n","a*l+b*n+c*o+d*i-e*p-f*j-g*k-h*m","a*m+b*k-c*j+d*p+e*i-f*o+g*n+h*l","a*n+b*l-c*p-d*j+e*o+f*i-g*m-h*k","a*o+b*p+c*l-d*k-e*n+f*m+g*i+h*j","a*p+b*o-c*n+d*m+e*l-f*k+g*j+h*i"] );
    });

    test('reverse: multivector', () => {
        const a = create("multivector", ["a","b","c","d","e","f","g","h"]);
        const result = reverse(a).map(x=>coefficient.format(x));
        expect(result).toEqual( ["a","b","c","d","-e","-f","-g","-h"] );
    });

    test('involute: multivector', () => {
        const a = create("multivector", ["a","b","c","d","e","f","g","h"]);
        const result = involute(a).map(x=>coefficient.format(x));
        expect(result).toEqual( ["a","-b","-c","-d","e","f","g","-h"] );
    });

    test('conjugate: multivector', () => {
        const a = create("multivector", ["a","b","c","d","e","f","g","h"]);
        const result = conjugate(a).map(x=>coefficient.format(x));
        expect(result).toEqual( ["a","-b","-c","-d","-e","-f","-g","h"] );
    });
  });

});