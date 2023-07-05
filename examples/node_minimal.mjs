import Algebra from '../src/GAmphetamine.js';

const result = Algebra( "3DPGA", {precompile:true, CSE:true, prefetch:false}, ()=>(1e1-1e2)*(1e1+1e2)*0.5 + '' );

console.log(result);
