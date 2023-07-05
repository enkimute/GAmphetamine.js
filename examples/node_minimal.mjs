import Algebra from '../src/GAmphetamine.js';

const result = Algebra( "3DPGA", {precompile:true, CSE:true, prefetch:false}, ()=>(1e1-1e2)*(1e1+1e2)*0.5 + '' );

console.log(result);

const result2 = Algebra( "3DPGA", {precompile:true, CSE:true, prefetch:false}, ()=>{
    const func = Element.compile((a,b)=>0.5*(a-b)*(a+b),[1,1]);
    return func(1e1, 1e2) + '';
});

console.log(result2);

Algebra(7, ()=>{
    // Our function.
    const func = (a,b)=>(0.5*(a-b)*(a+b)).grade(2);
    // The compiled version for two vectors a,b.
    const fast = Element.compile(func,[1,1]);
    // Compare timing.
    const a = 1e1, b = 1e2;
    var r1;
    console.time('func'); 
      for (var i=0; i<1000000; ++i) r1 = func(a,b);
    console.timeEnd('func');
    var r2;
    console.time('fast');
      for (var i=0; i<1000000; ++i) r2 = fast(a,b);
    console.timeEnd('fast');
    var r3 = Element.bivector();
    console.time('fast no alloc');
      for (var i=0; i<1000000; ++i) fast(a,b,r3);
    console.timeEnd('fast no alloc');
    console.log(r1+'', r2+'', r3+'');
    console.log(fast.toString());
});

