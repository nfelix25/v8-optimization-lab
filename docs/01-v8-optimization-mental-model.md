# V8 Optimization Mental Model

## The Big Picture

V8 is a **speculative optimizing compiler**. It makes aggressive assumptions about your code based on what it has observed, then generates highly optimized machine code under those assumptions. When assumptions are violated, it **deoptimizes** back to slower code.

Understanding this speculation → optimization → deoptimization cycle is the key to writing performant Node.js code.

## The Execution Pipeline

```
JavaScript Source
      ↓
  [Parser]
      ↓
  Ignition (Interpreter)           ← Executes immediately, gathers feedback
      ↓                             ↓
  Sparkplug (Baseline Compiler) ← Fast native code from bytecode
      ↓                             ↓
  (Hot enough?) ───────────────→ Maglev (Mid-tier Optimizer)
      ↓                             ↓
  (Still hotter?) ─────────────→ TurboFan (Top-tier Optimizer)
      ↓
  Optimized Code
      ↓
  (Assumption violated!)
      ↓
  [DEOPT/OSR] → Tier down (maybe to Sparkplug or Ignition)
```

### Key Stages

1. **Ignition (Interpreter)**
   - Executes bytecode immediately while V8 parses the file
   - **Collects type feedback**: "Parameters look like Smis" "Property load saw shape X"
   - Lowest startup cost, but slower throughput

2. **Sparkplug (Baseline Compiler)**
   - Compiles Ignition bytecode to native machine code quickly
   - Reuses Ignition's feedback without heavy optimization passes
   - Acts as the new "default" tier for any code that runs a few times
   - Supports on-stack replacement (OSR) to tier up without restarting loops

3. **Maglev (Mid-tier Optimizing Compiler)**
   - Introduced to cover the gap between Sparkplug and TurboFan
   - Performs lightweight specialization (type checks, simple inlining)
   - Much faster to compile than TurboFan, but typically good enough for most production hot paths

4. **TurboFan (Top-tier Optimizing Compiler)**
   - Reserved for the very hottest, most stable code regions
   - Runs heavy optimization passes and generates the fastest code, but with noticeable compile cost

5. **Deoptimization (Bailout) & Tier-Down**
   - When speculative assumptions fail, V8 can drop from TurboFan → Maglev → Sparkplug or even back to Ignition
   - **OSR exits** gracefully reconstruct state for the lower tier
   - **Repeated deopts on hot paths = performance cliff**, because V8 stops trying to re-optimize after enough failures

> **Tiering mental model**: Think of Ignition as the bytecode interpreter, Sparkplug as the default baseline compiler, Maglev as a mid-tier optimizer, and TurboFan as the expensive-but-fast specialist. Code may skip tiers (e.g., go Ignition → Sparkplug and stay there) depending on heuristics.

## Core Concepts

### 1. Hidden Classes (Shapes/Maps)

V8 doesn't see JavaScript objects as dictionaries. It sees them as instances of **hidden classes** (also called "shapes" or "maps").

```javascript
// These two objects have DIFFERENT hidden classes:
const obj1 = { x: 1, y: 2 };
const obj2 = { y: 2, x: 1 };  // Different property order!

// Adding properties transitions to new hidden classes:
const obj3 = { x: 1 };        // Hidden class A
obj3.y = 2;                    // Transitions to hidden class B
```

**Why it matters:**
- Property access is optimized based on hidden class
- Shape changes invalidate optimizations
- Consistent shapes = predictable, fast code

**Mental model**: Think of hidden classes like C++ struct layouts. V8 generates code assuming "offset of property x is always 16 bytes from object start". Shape changes break this.

### 2. Inline Caches (ICs)

When V8 sees a property access or function call, it creates an **inline cache** that remembers what happened:

```javascript
function getX(obj) {
  return obj.x;  // ← Inline cache here
}
```

**IC States:**
- **Uninitialized**: Never executed
- **Monomorphic**: Sees one hidden class (FAST!)
  - "obj always has shape A, x is at offset 16"
- **Polymorphic**: Sees 2-4 hidden classes (slower)
  - "obj is usually shape A or B, check which and branch"
- **Megamorphic**: Sees 5+ hidden classes (SLOW)
  - "obj could be anything, do full property lookup"

**Mental model**: Like a CPU branch predictor. Monomorphic = always predicts correctly. Megamorphic = can't predict, always pays full lookup cost.

### 3. Elements Kinds (Array Storage)

V8 optimizes arrays based on what they contain:

```javascript
// PACKED_SMI_ELEMENTS (fastest)
const a = [1, 2, 3];

// PACKED_DOUBLE_ELEMENTS (fast)
const b = [1.1, 2.2, 3.3];

// PACKED_ELEMENTS (slower, can hold anything)
const c = [1, "string", {}];

// HOLEY_SMI_ELEMENTS (slow, has holes)
const d = [1, , 3];  // Note the hole
```

**Elements kind transitions:**
- **One-way**: SMI → DOUBLE → ELEMENTS
- **Permanent**: Once holey, always holey
- **Poisoning**: One bad element can degrade the whole array

**Mental model**: Like specialized array implementations in C++. `int[]` is faster than `void*[]`. V8 picks the most specific type it can prove.

### 4. Smi vs. HeapNumber

JavaScript numbers are either:
- **Smi** (Small Integer): 31-bit integers, stored directly (no allocation)
- **HeapNumber**: Everything else (floats, large ints), stored on heap (allocation cost)

```javascript
// Smi range (64-bit Node): -2^30 to 2^30 - 1
const smi = 42;           // Smi (fast)
const tooBig = 2**31;     // HeapNumber (slower)
const float = 1.5;        // HeapNumber (slower)
```

**Mental model**: Smis are like unboxed values. HeapNumbers are like pointers. Keep hot-path math in Smi range when possible.

### 5. Polymorphism vs. Megamorphism

**Polymorphism**: A call site sees a small number of different types (2-4).
- TurboFan can handle this with checks + branches
- Still fast enough if types are predictable

**Megamorphism**: A call site sees many different types (5+).
- V8 gives up on specialization
- Falls back to generic slow path
- **This is the silent killer**

```javascript
// Megamorphic example:
function process(obj) {
  return obj.value;  // ← This property access
}

// Called with 10 different object shapes:
process({ value: 1 });
process({ value: 2, other: 'x' });
process({ other: 'y', value: 3 });  // Different order!
// ... 7 more different shapes
// → Property access becomes megamorphic (slow)
```

**Mental model**: Polymorphism is "a few fast cases with a check". Megamorphism is "gave up, always slow".

## How Optimization Works (Simplified)

### Type Feedback

As code runs in Ignition, V8 collects feedback:

```javascript
function add(a, b) {
  return a + b;
}

add(1, 2);       // Feedback: "a and b are Smis"
add(5, 10);      // Feedback: "still Smis"
add(100, 200);   // Feedback: "consistently Smis"

// After enough calls, TurboFan optimizes:
// "Generate integer addition code; if inputs aren't Smis, deopt"
```

### Speculative Optimization

TurboFan generates code like:
```
// Pseudocode for optimized add():
if (a is Smi && b is Smi) {
  return fast_integer_add(a, b);
} else {
  DEOPTIMIZE();
}
```

### Deoptimization Triggers

If the assumption breaks:
```javascript
add(1.5, 2.7);  // Not Smis! → DEOPT
```

V8:
1. Discards optimized code
2. Returns to Ignition
3. Collects new feedback ("sometimes floats")
4. May re-optimize with broader assumptions (or not)

## Common Deopt Categories

### 1. Type Confusion

**Symptom**: Function sees different types than expected.

```javascript
function double(x) {
  return x * 2;
}

// Optimized for Smis:
double(5);
double(10);

// Deopt:
double(1.5);  // HeapNumber
```

**Fix**: Keep hot paths monomorphic; normalize inputs at boundaries.

### 2. Shape Instability

**Symptom**: Objects have inconsistent hidden classes.

```javascript
function getCoords(obj) {
  return { x: obj.x, y: obj.y };
}

getCoords({ x: 1, y: 2 });
getCoords({ y: 2, x: 1 });  // Different shape! → Deopt
```

**Fix**: Always initialize objects with same property order.

### 3. Bailout Conditions

**Symptom**: V8 can't optimize certain constructs.

```javascript
function risky() {
  try {
    // Code here cannot be fully optimized
  } catch (e) { }
}
```

**Fix**: Isolate bailout triggers to separate functions.

### 4. Megamorphism

**Symptom**: Call site sees too many types.

```javascript
// Shared utility called with many object shapes:
function log(obj) {
  console.log(obj.message);  // Megamorphic after ~5 shapes
}
```

**Fix**: Don't share hot functions across unrelated types; use separate code paths.

## Mental Model Summary

Think of V8 as a **JIT compiler with a prediction engine**:

1. **It observes** what your code does (type feedback)
2. **It predicts** that the pattern will continue
3. **It optimizes** for the observed case (specialization)
4. **It validates** assumptions at runtime (guards)
5. **It deopts** when wrong (expensive!)

**The goal**: Write code that lets V8 make **stable, accurate predictions**.

## Key Takeaways

1. **Stability matters more than raw speed**
   - Consistent shapes > hand-optimized mess
   - Monomorphic call sites > premature abstraction

2. **Hot paths get special treatment**
   - Inner loops: keep shapes consistent, types predictable
   - Cold paths: don't worry about it

3. **V8 is not psychic**
   - It optimizes for what it observes
   - If you change behavior, it has to re-learn

4. **Deopts are not always bad**
   - Cold path deopt: irrelevant
   - Hot path deopt: performance killer
   - Repeated deopt: disaster

5. **Evidence > intuition**
   - Use traces to see what actually happens
   - Timings can lie; traces don't

## Further Reading

- [V8 Blog](https://v8.dev/blog) - Official V8 team posts
- [Hidden Classes in V8](https://v8.dev/docs/hidden-classes)
- [Elements Kinds in V8](https://v8.dev/blog/elements-kinds)

## Next Steps

Read `02-tooling-node-v8-flags.md` to learn how to observe this model in action, then run experiments to build intuition.
