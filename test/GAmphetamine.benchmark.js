import Algebra from '../src/GAmphetamine.js';

// Create some PGA algebras with various optimisation options.
const PGA        = Algebra("3DPGA", {flat:false, CSE:true, prefetch:true});
const PGA_flat   = Algebra("3DPGA", {flat:true,  CSE:true, prefetch:true});
const PGA_no_cse = Algebra("3DPGA", {flat:false, CSE:false, prefetch:true});
const PGA_no_opt = Algebra("3DPGA", {flat:false, CSE:false, prefetch:false});

// Also create one using the ganja.js library. (which is assumed to be loaded as 'ganja' here.)
const PGA_ganja  = ganja(3,0,1);

// Some constants and arrays that allow us to create all the tests.
const names     = ['PGA GANJA', 'PGA  FLAT','PGA NOOPT','PGA NOCSE','PGA      '];
const algebras  = [ PGA_ganja, PGA_flat,  PGA_no_opt, PGA_no_cse, PGA ]; 
const operators = ['gp', 'sw', 'cp', 'ip', 'op', 'rp', 'lp', 'add', 'sub', 'prj', 'normalized'].map(x=>Array(6).fill(x)).flat();

// The number of times to repeat each operator in the benchmark.
export const loopcount  = 500;

// We run over a bunch of binops, and execute tests in each algebra.
export const all_tests = names.map((name, nameI)=>operators.map((op, opI)=>
  algebras[nameI].inline((loopcount, op, opI, name)=>{
    // These are prototype vectors, bivectors, trivectors, rotors and multivectors.
    const vec = 1e1, biv = 1e12, rot = 1 + 1e12, tri = 1e123, mv = rot + vec + tri;
    // setup arguments and function for each operator. (we do vec-vec, biv-biv, vec-biv, rot-biv, rot-rot and mv-mv for each op)
    const a = [ vec,  biv,  vec,  rot, rot, mv][opI%6];
    const b = [ vec,  biv,  biv,  biv, rot, mv][opI%6];
    const f = op;
    // ganja.js syntax fix. Not all syntax is the same so we upgrade to patch up.
    if (a.gp === undefined) a.gp = a.Mul;
    if (a.ip === undefined) a.ip = a.Dot;
    if (a.lp === undefined) a.lp = a.LDot;
    if (a.op === undefined) a.op = a.Wedge;
    if (a.rp === undefined) a.rp = a.Vee;
    if (a.cp === undefined) a.cp = function(b,r) { return 0.5*(this*b - b*this); };
    if (a.sw === undefined) a.sw = function(b,r) { return this >>> b; };
    if (a.add === undefined) a.add = function(b,r){ return this+b; };
    if (a.sub === undefined) a.sub = function(b,r){ return this-b; };
    if (a.prj === undefined) a.prj = function(b,r){ return (this|b)/b; };
    if (a.normalized === undefined) a.normalized = function() { return this.Normalized; };
    // precompile - GAmphetamine creates the code on this first run, which we do not
    // want to include in the timing.
    a.func = a[f];
    var r = a.func(b);
    // Now run it hot so the js engine can JIT it to.
    const unary = op == 'normalized';
    if (unary)
      for (var i=200; i; --i) a.func(r);
    else  
      for (var i=200; i; --i) a.func(b,r);
    // now return the actual test function that runs our operator in loop without
    // any setup.
    var ret = (unary) ? ()=>{
        for (var i=loopcount; i; --i) a.func(r);
        return r;
    }:()=>{
      for (var i=loopcount; i; --i) a.func(b,r);
      return r;
    }
    // Add suite name and test description for logging later.
    ret.suite = name; 
    ret.desc  = `test ${op} ${['vv', 'bb', 'bv', 'rt', 'rr', 'mm'][opI % 6]}`;
    return ret;
  })(loopcount, op, opI, name)
))
