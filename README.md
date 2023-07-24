# GAmphetamine.js

![Build Status](https://img.shields.io/github/actions/workflow/status/enkimute/GAmphetamine.js/build.yml?branch=main)
![Test Status](https://img.shields.io/github/actions/workflow/status/enkimute/GAmphetamine.js/test.yml?branch=main)
![Build Status](https://github.com/enkimute/GAmphetamine.js/actions/workflows/build.yml/badge.svg?branch=master)
![Test Status](https://github.com/enkimute/GAmphetamine.js/actions/workflows/test.yml/badge.svg?branch=master)
![MIT License](https://img.shields.io/github/license/enkimute/GAmphetamine.js)
![Last Commit](https://img.shields.io/github/last-commit/enkimute/GAmphetamine.js)
![Open Issues](https://img.shields.io/github/issues/enkimute/GAmphetamine.js)
![Pull Requests](https://img.shields.io/github/issues-pr/enkimute/GAmphetamine.js)

A Geometric Algebra code generator for JavaScript with advanced symbolic optimisation and a strong focus on performance.

# **Why GAmphetamine?**

## **Performance**

GAmphetamine is fast. Not just compared to it's predecessor ganja.js, but also compared to
GA implementations for other languages. The comparison with ganja.js is however most relevant,
so we've summarized some of this in the table below.

| task | Algebra | ganja.js | GAmphetamine.js | Speedup
|------|:-------:|---------:|---------------:|---:
| 1M geometric product of bivectors | $\mathbb R_5$       | 1332.78 ms | 95.09 ms | **14.0 x**
| 1M commutator product of bivectors| $\mathbb R_{3,0,1}$ | 963.82 ms  | 59.73 ms | **16.1 x**
| 10M sandwich rotor on trivector   | $\mathbb R_{3,0,1}$ | 3491.78 ms | 589.49 ms| **5.9 x**
| 1M bivector inverse               | $\mathbb R_{3,0,1}$ | 3215.18 ms | 79.79 ms | **40.29 x**
| 1M sandwich rotor on vector       | $\mathbb R_{6}$     |304558.73 ms| 387.16ms | **768.64 x** 
| 1M commutator product of bivectors| $\mathbb R_{6}$     |305316.87 ms|  98.86ms | **3088.22 x**

Runtime performance is important, but so is the performance of the Algebra and code generation.
The following table shows the time-to-first product for both ganja.js and GAmphetamine.js

| Algebra      | Not Precompiled<BR>(default)  | <BR> Flat, CSE | Precompiled<BR> Typed, CSE | <BR> Typed, no CSE | <BR>Ganja.js
|--------------|:----------------:|------------------:|-------------------:|---------:|---------------:
| $\mathbb R_1$|       **1.33 ms**|           21.10 ms|            26.30 ms| 23.20 ms |         0.73 ms
| $\mathbb R_2$|       **2.37 ms**|           20.30 ms|            70.40 ms| 53.60 ms |         0.86 ms
| $\mathbb R_3$|       **2.90 ms**|           44.10 ms|           138.40 ms| 94.20 ms |         1.24 ms 
| $\mathbb R_4$|       **3.40 ms**|          203.20 ms|           359.20 ms| 200.90 ms|         2.56 ms
| $\mathbb R_5$|       **4.75 ms**|          258.40 ms|          1533.10 ms| 539.00 ms|         7.62 ms

Note that GAmphetamine defaults to not precompiled, which means that the actual code for the operators you use is generated
at runtime, when they are first used between a given pair of types. 

## **Symbolic Computation and $\LaTeX$ output.**

The key to GAmphetamine's performance is coefficient level symbolic optimisations. This feature is
used internally to generate efficient code for the various operators, but is also provided via the
API. 

```javascipt
Algebra(3, ()=>Element.vector('a') | Element.vector('b') + '') 
```
> `(a1*b1+a2*b2+a3*b3)`

Additionally, you can request GAmphetamine to output as $\LaTeX$, making it easy to use it to 
construct symbolic computations in your writeups.

```javascript
Algebra(3, {printFormat : 'latex'}, ()=>{
   const a = Element.vector('a_');
   const b = Element.vector('b_');
   console.log( String.raw`
   \begin{aligned}
     (${a})*(${b}) &= ${a | b} \\
                   &+ ${a ^ b}
   \end{aligned}
   `);
});
```
produces the following output
```
   \begin{aligned}
     (a_1\mathbf e_{1} + a_2\mathbf e_{2} + a_3\mathbf e_{3})*(b_1\mathbf e_{1} + b_2\mathbf e_{2} + b_3\mathbf e_{3}) &= (a_1b_1+a_2b_2+a_3b_3)
                   &+ (a_1b_2-a_2b_1)\mathbf e_{12} + (a_1b_3-a_3b_1)\mathbf e_{13} + (a_2b_3-a_3b_2)\mathbf e_{23}
   \end{aligned}
```
which renders as 

$$\begin{aligned}
     (a_1\mathbf e_{1} + a_2\mathbf e_{2} + a_3\mathbf e_{3})*(b_1\mathbf e_{1} + b_2\mathbf e_{2} + b_3\mathbf e_{3}) &= (a_1b_1+a_2b_2+a_3b_3) \\
                   &+ (a_1b_2-a_2b_1)\mathbf e_{12} + (a_1b_3-a_3b_1)\mathbf e_{13} + (a_2b_3-a_3b_2)\mathbf e_{23}
   \end{aligned}$$


## **Visualization**

tbc

# **Creating an Algebra**

GAmphetamine offers a wide ranges of options to create your algebra. Let's review a few examples. 
Mathematically, the algebras we will create are all of the form :

$$ \mathbb R_{p,q,r} $$

Where $p$ denotes the number of positive basis vectors, $q$ the number of negative basis vectors 
and $r$ the number of null basis vectors. These basis vectors then combine into higher grade elements 
such as bivectors, trivectors, .. to form the full multivector basis. For higher grade elements, a 
choice of permutation is made (e.g. $e_{13}$ vs $e_{31}$). GAmphetamine defaults to
the lexical ordering $e_{13}$, but allows you to specify any basis order.

## **Named Algebras**

In our first example, however, we show how you can avoid making any of those difficult choices by using one of the named algebras.

```javascript
Algebra("3DPGA", ()=> ... );
  // 𝐞₀² = 0
  // 𝐞₁² = 𝐞₂² = 𝐞₃² = +1
```

Here, the algebra created will be $\mathbb R_{3,0,1}$ on a specific basis. It will also make sure that the 
basis vector start numbering at zero (`startIndex`) and that it is indeed $\mathbf e_0$ that squares to zero.

Here is a list of these algebras and the options they set.

| name  | algebra             | basis
|-------|:-------------------:|--------
| 2DPGA | $\mathbb R_{2,0,1}$ |  $1,\mathbf e_{1},\mathbf e_{2},\mathbf e_{0},\mathbf e_{20},\mathbf e_{01},\mathbf e_{12},\mathbf e_{012}$
| 3DPGA | $\mathbb R_{3,0,1}$ |  $1,\mathbf e_{1},\mathbf e_{2},\mathbf e_{3},\mathbf e_{0},\mathbf e_{01},\mathbf e_{02},\mathbf e_{03},\mathbf e_{12},\mathbf e_{31},\mathbf e_{23},\mathbf e_{032},\mathbf e_{013},\mathbf e_{021},\mathbf e_{123},\mathbf e_{0123}$
| STA   | $\mathbb R_{1,3}$   |  lexical
| 2DCGA | $\mathbb R_{3,1}$   | lexical
| 3DCGA | $\mathbb R_{4,1}$   | lexical

## **Specifying the metric**

If you are ok with lexical ordering, the following syntax allows you to create an algebra 
directly with the required number of generators of each type.

```javascript
Algebra(p, q, r, ()=> ... );
  // if r ≠ 0
  //   𝐞₀²,   ..., 𝐞ᵣ₋₁²    = 0
  //   eᵣ²,   ..., 𝐞ᵣ₊ₚ₋₁²  = +1
  //   𝐞ᵣ₊ₚ²,  ...          = -1
  // if r = 0
  //   𝐞₁²,   ..., 𝐞ₚ₋₁²    = +1
  //   𝐞ₚ²,   ...           = -1
```
This syntax will first create $r$ null basis vectors, then $p$ positive ones, and lastly $q$ negative ones. 
If $r=0$ the basis vectors will start at $\mathbf e_1$, otherwise they start at $\mathbf e_0$. If you would 
like more control over which basis vector has which metric, you can use the following syntax to get a **custom order**

```javascript
Algebra("--0+-", ()=>{ ... });
// 𝐞₁² =  𝐞₂² = 𝐞₅² = -1
// 𝐞₃² = 0
// 𝐞₄² = +1
```
Which would create a 5 dimensional algebra where the first two and the last basis vector square
to $-1$, the third one is null and the fourth one is positive. 

For even further control, you can access **non-unit metrics** via the options object:

```javascript
Algebra({metric:[0.5,-0.5]}, ()=>{ ... });
// 𝐞₁² =  0.5
// 𝐞₂² = -0.5
```

## **Custom basis names**

There are several ways to overload the default basis names. For example you could use

```javascript
Algebra("STA", {startIndex : 0}, ()=>{ ... });
// 𝐞₀² = +1
// 𝐞₁² = 𝐞₂² = 𝐞₃² = -1
```

To get a version of STA that starts with a time vector of `𝐞₀` (matching nicely with `γ₀`). Or you can change 
the order of basis vectors in a basis k-blade, and basis k-blades in a k-vector by specifying your own complete basis.

```javascript
Algebra({ metric : "++", basis : ["1","e2","e1","e21"]}, ()=>{ ... });
// 𝐞₁² = 𝐞₂² = +1
// 𝐞₁ * 𝐞₂ = -e₂₁
```

keep in mind to keep your grades here in order, first all elements of grade 0, then 1 etc.
You get full control over memory layout by specifying custom types!

## **Types & Custom Types**

By default, GAmphetamine will create a set of classes representing your vectors, bivectors, rotors, etc. Each of 
those clases then implements all of the geometric algebra operations you expect, with implementations optimized 
for each of the specific type combinations.

For a simplified approach, it is possible to have GAmphetamine create only a single multivector type. (it will 
however have $2^n$ coefficients). To use this flat multivector layout pass in the option `flat:true`

```javascript
Algebra("3DPGA", {flat:true}, ()=>{ ... });
```

However, by default, GAmphetamine creates the following custom types for optimal memory use and performance

| name      | description 
|-----------|------------
| scalar    | pure scalar multivector
| vector    | $\sum \mathbf e_i$
| bivector  | $\sum \mathbf e_{ij}$
| trivector | $\sum \mathbf e_{ijk}$
| ...       | ...
| rotor     | $\sum \langle x \rangle_{2k}$
| study     | $\langle x\rangle + \langle x\rangle_4$

where the memory layout of each of these types is determined by default by the basis order. It is however 
possible to specify custom types with custom ordering.

```javascript
Algebra(2,{types:[
    {name:'scalar',layout:["1"]},
    {name:'vector',layout:["e1","e2"]},
    {name:'multivector',layout:["1","e12","e2","e1"]}
]}, ()=>{ ... });
```
To create an algebra with three types, scalars, vectors and multivectors. In such an algebra the outer product 
between two vectors will output a multivector (as opposed to the default bivector).

**note:**
The 'scalar' and 'multivector' types are required, and should be the first and last types defined.

## Custom Methods

By default, GAmphetamine will provide all basic geometric algebra operations between all
of the defined types. Below is a list of these operators, with a short description.

| method   | formula               | description |
|----------|:----------------------|-------------|
|add       | $ a + b $             | addition
|sub       | $ a - b $             | subtraction
|gp        | $ ab $                | geometric product
|op        | $ a \wedge b $        | outer product
|ip        | $ a \cdot b $         | inner product
|lip       | $ a \rfloor b $       | left contraction
|rip       | $ a \lfloor b $       | right contraction
|reverse   | $ \tilde a $          | reverse
|involute  | $ \hat a $            | grade involution
|conjugate | $ \hat {\tilde a} $   | Clifford conjugate
|dual      | $ a^* $               | dual
|undual    | $ a^{-*} $            | undual
|prj       | $ (a \cdot b)b^{-1} $ | projection 
|rp        | $ a \vee b $          | regressive product
|cp        | $ a \times b $        | commutator product 
|norm      | $ \lvert a \rvert$    | norm
|normalized| $ \bar a $            | normalisation
|sqrt      | $ \sqrt a $           | square root
|sw        | $ -1^{st}ab\tilde a $ | sandwich
|inverse   | $ a^{-1} $            | inverse
|cprj      | $  $                  | camera projection (internal)

It is however also easy to add your own operators and methods. The most straightforward
way of doing this, is to use the addMethod function exposed on Element. As an example, let
us add an anti-commutator operator to all of our classes.

```javascript
Algebra( "+++", ()=>{

  var acp = (a,b) => 0.5*(a*b + b*a);

  Element.addMethod(acp, "acp");

  return 1e1.acp(1e23);  

})
```
which for this example, would ended up compiling the following function for the anti-commutator product on the last line : 

```javascript
function acp_vector_bivector (a,b,res=new classes.trivector()) {
  const a0=a[0],a1=a[1],a2=a[2],b0=b[0],b1=b[1],b2=b[2];
  res[0]=a0*b2-a1*b1+a2*b0;
  return res;
}
```

## **baseType**

By default, GAmphetamine stores the coefficients for each of your multivector types using `Float32Array` typed 
javascript arrays. You can easily change this to any of the other typed array versions.

```javascript
Algebra(3, {baseType: Float64Array}, ()=>{ ... });
```

## **printFormat & printPrecision**

For console output you can setup both the `printFormat` and `printPrecision`

```javascript
Algebra(3,{printFormat: "latex", printPrecision: 5}, ()=>{ ... });
// multivector.toString will now produce LaTeX output 
// with numbers printed with 5 digits behind the decimal point.
```

| printFormat | Description     | example            |
|-------------|-----------------|--------------------|
| `latex`     | Output $\LaTeX$ | `\mathbf e_{12}`   |
| `ascii`     | Output unicode. | 𝐞₁₂                |

## **Common Subexpression Elimination, Prefetching and precompilation**

By default, the code generated by GAmphetamine will perform CSE and prefetch array variables to optimize 
performance. This is a trade-off between that sacrifies compilation time for improved runtime performance.
Both options can be controlled via the options object.

```javascript
Algebra( 
    p, q, r, 
    {
        CSE        : true,         // Common Subexpression Elimination.
        prefetch   : true          // Prefetch Variables.
        precompile : false,        // Precompile all functions
    }, 
    ()=>{ ... }
);
```

Precompilation forces GAmphetamine to create all operators for all combinations of types at startup. By default, 
each product is only compiled when it is used for the first time. There are few reasons to ask for precompilation
as it will typically generate a large amount of code that is subsequently never used. (for "3DPGA" GAmpetamine 
precompile creates almost 333kb of code, and takes 700ms to do so.)

## **All Options**

Combined, the full options object looks like :

```javascript
options = {
   p,q,r,           // metric signature in p,q,r format
   metric,          // metric as string with -+0 ("-+++") or array ([0,1,1,1])
   basis,           // custom basis to use (["1","e1","e2","e21"])
   types,           // an array of types of multivectors to support, and their layout. 
   methods,         // an array of methods to add.
   printPrecision,  // number of significant digits to print behind the decimal separator
   printFormat,     // ["console"||"","latex"]
   startIndex,      // starting index for the first basis vector. (default is 1, or 0 if q != 0)
   Cayley,          // full custom cayley table.
   precompile,      // precompile all functions. (gets slow for big algebras, defaults to false)
   flat,            // use flat storage model. (full 2^n sized multivectors)
   CSE,             // perform extra CSE. (defaults to true)
   prefetch,        // prefetch mv coefficients.
   debug,           // store debug information (code generated, etc ..)
}
```

# Algebra Features

## **Operators**

The Algebras generated by GAmphetamine all support a unified set of operators

| operator              | name              |function call    | inline syntax
|-----------------------|-------------------|-----------------      |----------------
| $a + b$               | addition          | `a.add(b)`      | `a + b`
| $a - b$               | subtraction       | `a.sub(b)`      | `a - b`
| $ab$                  | geometric product | `a.gp(b)`       | `a * b`
| $a \wedge b$          | outer product     | `a.op(b)`       | `a ^ b`
| $a \cdot b$           | inner product     | `a.ip(b)`       | `a \| b`
| $a \vee b$            | regressive product| `a.rp(b)`       | `a & b`
| $a \rfloor b $        | left contraction  | `a.lp(b)`       | `a << b`
| $a \lfloor b $        | right contraction | `a.rip(b)`      | `a >> b`
| $a[b]$                | sandwich product  | `a.sw(b)`       | `a >>> b`
| $a \times b$          | commutator product| `a.cp(b)`       | 
| $a^*$                 | hodge dual        | `a.dual()`      | `!a`
| $a^{-*}$              | hodge undual      | `a.undual()`    | 
| $\tilde a$            | reverse           | `a.reverse()`   | `~a`
| $\hat a$              | involute          | `a.involute()`  | 
| $\hat{\tilde a}$      | conjugate         | `a.conjugate()` |
| $\langle a \rangle_k$ | grade selection   | `a.grade(k)`    |
| $a^{-1}$              | inverse           | `a.inverse()`   | `a**-1`
| $\sqrt a$             | square root       | `a.sqrt()`      | `a**.5`
| $\sqrt{a\tilde a}$    | norm              | `a.norm()`      |
| $a/\sqrt{a\tilde a}$  | normalize         | `a.normalized()`|

## **Symbolic Evaluation**

The symbolic optimizer that GAmphetamine uses internally to generate its code is also available via the API. This 
allows you to do various symbolic computations and use GAmphetamine to help you for example check your proofs or 
output your $\LaTeX$ expressions.

### **Creating symbolic multivectors**

To create a multivector with named coefficients, simply feed in strings to the respective constructor functions.

```javascript
Algebra(3, ()=>{
   var s = Element.scalar("s");
   var t = Element.vector("x","y","z");
   
   return s*t + '';
})
// (s*x) e₁ + (s*y) e₂ + (s*z) e₃
```

While you can fully specify own names to label each of your coefficients as above, it is also possible to let 
GAmphetamine index your names automatically.

```javascript
Algebra(3, ()=>{
   var s = Element.scalar("s");
   var v = Element.vector("v");
   
   return s*v + '';
})
// (s*v1) e₁ + (s*v2) e₂ + (s*v3) e₃
```

To do so simply specify only a single coefficient as in the example above for the vector $v$. When such a single
name provided ends on `[,(,{`, GAmphetamine will also close those brackets for you. This is very practical for $\LaTeX$ output.

```javascript
Algebra(3, {printFormat : "latex"}, ()=>{
   var a = Element.vector("a_{");
   var b = Element.vector("b_{");
   
   return a*b + '';
})
// (a_{1}b_{1}+a_{2}b_{2}+a_{3}b_{3}) + (a_{1}b_{2}-a_{2}b_{1})\mathbf e_{12} + (a_{1}b_{3}-a_{3}b_{1})\mathbf e_{13} + (a_{2}b_{3}-a_{3}b_{2})\mathbf e_{23}
```
$$ (a_{1}b_{1}+a_{2}b_{2}+a_{3}b_{3}) + (a_{1}b_{2}-a_{2}b_{1})\mathbf e_{12} + (a_{1}b_{3}-a_{3}b_{1})\mathbf e_{13} + (a_{2}b_{3}-a_{3}b_{2})\mathbf e_{23}$$
Here the result can be directly included in your document. To help verify an expression, simply subtract the 
RHS from the LHS and verify the result is zero.

For example let us verify that $aB = a\cdot B + a\wedge B$ for any vector $a$ and bivector $B$

```javascript
Algebra(3, ()=>{
   var a = Element.vector("a_{");
   var B = Element.bivector("B_{");
   // a*B = a|b + a^B
   return (a*B) - (a|B + a^B);
})+''
// 0
```

## **Inline Syntax**

### **Algebraic Literals**

### **Operator Overloading**

### **Hestenes Presedence**

# Visualisation

## **Graph Function**

## **Graph Options**

## **Custom Interpreter**







