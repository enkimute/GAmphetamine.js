import Algebra from '../src/GAmphetamine.js';

const result = Algebra( "3DPGA", {precompile:false, CSE:true, prefetch:false}, ()=>(1e1-1e2)*(1e1+1e2)*0.5 + '' );

console.log(result);

const result2 = Algebra( "3DPGA", {precompile:false, CSE:true, prefetch:false}, ()=>{
    const func = Element.compile((a,b)=>0.5*(a-b)*(a+b),[1,1]);
    return func(1e1, 1e2) + '';
});

console.log(result2);

Algebra(6, ()=>{
    // Our function.
    const func = (a,b)=>(0.5*(a-b)*(a+b)).grade(2);
    // The compiled version for two vectors a,b.
    const fast = Element.compile(func,[1,1]);
    // Also add it as method
    Element.addMethod( func, 'func' );
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
    var r4 = Element.bivector();
    console.time('method no alloc');
      for (var i=0; i<1000000; ++i) a.func(b,r4);
    console.timeEnd('method no alloc');
    console.log(r1+'', r2+'', r3+'', r4+'');
    console.log(fast.toString());
});

Algebra("3DPGA", ()=>{

    // Some variable in our scope.
    var p1 = !(1e0 + 1e1 + 2e2 + 3e3);

    // not a pure function
    const join = a => p1 & a;

    // scope variables will be clocked in as constant coefficients!
    // so the value of p1 at compile time!
    const comp = Element.compile(join, [3]);

    // Show the compiled code.
    console.log(comp.toString());

})