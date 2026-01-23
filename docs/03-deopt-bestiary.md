# Deoptimization Bestiary

## Overview

A comprehensive catalog of deoptimization triggers, how to detect them, and how to mitigate them. Think of this as a field guide to optimization hazards.

## Understanding Deopt Severity

Not all deopts are created equal:

- **Harmless**: One-time deopt on a cold path during warmup
- **Concerning**: Repeated deopts on a warm path
- **Critical**: Repeated deopts in a hot loop or request handler

**Rule of thumb**: If it's not in your hot path, don't worry about it.

## Deopt Categories

### 1. Type Instability

**What it is**: Function sees different types than V8 expected.

**Symptoms**:
- Deopt reason: `Insufficient type feedback`, `Not a Smi`, `Not a heap number`
- Function deoptimizes when receiving unexpected types

**Common triggers**:

```javascript
// Trigger: Mixing Smis and floats
function add(a, b) {
  return a + b;
}

add(1, 2);      // Smi + Smi
add(1, 2);      // Optimized for Smis
add(1.5, 2.7);  // Deopt! Not Smis

// Trigger: Mixing types
function process(value) {
  return value * 2;
}

process(10);        // Optimized for numbers
process("hello");   // Deopt! String
```

**How to detect**:
```bash
node --trace-deopt script.js 2>&1 | grep "Not a Smi"
```

**Mitigation**:

```javascript
// Keep hot paths monomorphic
function add(a, b) {
  // Normalize inputs at boundary
  return (a | 0) + (b | 0);  // Force to int32
}

// Or: separate code paths
function processNumber(n) { return n * 2; }
function processString(s) { return s + s; }

function process(value) {
  if (typeof value === 'number') return processNumber(value);
  return processString(value);
}
```

**Related experiments**: `04-numbers-smis-doubles`

---

### 2. Shape Instability (Hidden Class Changes)

**What it is**: Objects with inconsistent hidden classes.

**Symptoms**:
- Deopt reason: `Wrong map`
- IC transitions to polymorphic/megamorphic

**Common triggers**:

```javascript
// Trigger: Property order
function Point(x, y) {
  this.x = x;
  this.y = y;
}

function makePoint(swapped) {
  if (swapped) {
    return { y: 0, x: 0 };  // Different shape!
  }
  return { x: 0, y: 0 };
}

// Trigger: Late property addition
const obj = { x: 1 };
// ... later
obj.y = 2;  // Shape transition

// Trigger: Deleting properties
const obj2 = { x: 1, y: 2 };
delete obj2.y;  // Shape change + dictionary mode (slow!)
```

**How to detect**:
```bash
node --trace-deopt script.js 2>&1 | grep "Wrong map"
node --trace-ic script.js 2>&1 | grep POLYMORPHIC
```

**Mitigation**:

```javascript
// Initialize all properties upfront, same order
function createPoint(x, y) {
  return { x, y };  // Always same shape
}

// Or use a class (guarantees consistent shape)
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

// Instead of delete, use null/undefined
const obj = { x: 1, y: 2 };
// delete obj.y;  // BAD
obj.y = null;     // GOOD - preserves shape
```

**Related experiments**: `01-hidden-classes`, `09-delete-in-operators`

---

### 3. Elements Kind Transitions

**What it is**: Array storage type changes (e.g., int → float → object).

**Symptoms**:
- Slower array operations
- Deopt reason: `Wrong map` (for array operations)

**Common triggers**:

```javascript
// Trigger: Smi → Double
const arr = [1, 2, 3];        // PACKED_SMI_ELEMENTS
arr.push(1.5);                 // → PACKED_DOUBLE_ELEMENTS

// Trigger: Numeric → Object
const arr2 = [1, 2, 3];       // PACKED_SMI_ELEMENTS
arr2.push("string");           // → PACKED_ELEMENTS (slow!)

// Trigger: Packed → Holey
const arr3 = [1, 2, 3];       // PACKED_SMI_ELEMENTS
arr3[10] = 4;                  // → HOLEY_SMI_ELEMENTS (slower!)

// Trigger: Creating holes
const arr4 = [1, , 3];        // HOLEY from the start
```

**How to detect**:
```bash
# Use --allow-natives-syntax in test script
node --allow-natives-syntax test.js
```

```javascript
const arr = [1, 2, 3];
console.log(%DebugPrint(arr));  // Shows elements kind
```

**Mitigation**:

```javascript
// Keep arrays homogeneous
const numbers = [1, 2, 3, 4.5];  // Start with double if needed
const mixed = [];                // Separate arrays for different types

// Preallocate to avoid holes
const arr = new Array(10).fill(0);  // Packed from start

// Avoid sparse arrays
// const bad = []; bad[1000] = 1;  // BAD
const good = new Array(1001).fill(null);
good[1000] = 1;  // Better (though wastes memory)
```

**Related experiments**: `03-elements-kinds`, `11-array-holes-and-bounds-checks`

---

### 4. Polymorphism & Megamorphism

**What it is**: Call site or property access sees many different types.

**Symptoms**:
- IC state: `POLYMORPHIC` (2-4 types) or `MEGAMORPHIC` (5+ types)
- No explicit deopt, just slow execution

**Common triggers**:

```javascript
// Trigger: Shared utility with many shapes
function getValue(obj) {
  return obj.value;  // ← This access
}

// Called with 10 different object shapes
getValue({ value: 1 });
getValue({ value: 2, extra: 'a' });
getValue({ extra: 'b', value: 3 });  // Different order
getValue({ value: 4, another: 'c' });
// ... 6 more different shapes
// → Property access becomes MEGAMORPHIC

// Trigger: Processing heterogeneous data
function process(item) {
  console.log(item.id);  // MEGAMORPHIC if many shapes
}

mixedArray.forEach(process);  // Each item has different shape
```

**How to detect**:
```bash
node --trace-ic script.js 2>&1 | grep MEGAMORPHIC
```

**Mitigation**:

```javascript
// Normalize at boundaries
function normalizeInput(raw) {
  return { value: raw.value, extra: raw.extra || null };
}

function getValue(obj) {
  return obj.value;  // Now monomorphic
}

// Or: use separate functions for different types
function processTypeA(item) { /* ... */ }
function processTypeB(item) { /* ... */ }

function process(item) {
  if (item.type === 'A') return processTypeA(item);
  return processTypeB(item);
}

// Or: avoid shared hot utilities for unrelated types
// Instead of one getX() for all objects, use specific accessors
```

**Related experiments**: `02-inline-caches`, `05-polymorphism-megamorphism`

---

### 5. Try-Catch & Bailout Conditions

**What it is**: Certain language features prevent or limit optimization.

**Symptoms**:
- Function not optimized at all, or optimized with limitations
- Deopt reason: Various bailout conditions

**Common triggers**:

```javascript
// Trigger: try-catch in hot function
function hot() {
  try {
    // This code may not be fully optimized
    return doWork();
  } catch (e) {
    return null;
  }
}

// Trigger: eval (makes optimization much harder)
function risky(code) {
  return eval(code);  // Bailout
}

// Trigger: with statement (don't use in modern JS anyway)
function ancient(obj) {
  with (obj) {
    return x + y;  // Bailout
  }
}

// Trigger: for-in over large objects (dictionary mode)
function iterate(obj) {
  for (const key in obj) {
    // May be slow if obj is in dictionary mode
  }
}
```

**How to detect**:
```bash
node --trace-opt script.js 2>&1 | grep "bailout"
```

**Mitigation**:

```javascript
// Isolate try-catch to separate (cold) function
function hotPath() {
  return doWork();  // Fully optimizable
}

function withErrorHandling() {
  try {
    return hotPath();
  } catch (e) {
    return null;
  }
}

// Avoid eval; use safer alternatives
// eval(code);  // BAD
const fn = new Function('return ' + code);  // Less bad (still risky)

// Prefer for-of or Object.keys
for (const key of Object.keys(obj)) {  // More optimizable
  // ...
}
```

**Related experiments**: `06-try-catch-and-bailouts`

---

### 6. Arguments Object

**What it is**: Using `arguments` object can prevent optimization.

**Symptoms**:
- Function not optimized or partially optimized
- Deopt when accessing `arguments` in unexpected ways

**Common triggers**:

```javascript
// Trigger: arguments object
function sum() {
  let total = 0;
  for (let i = 0; i < arguments.length; i++) {
    total += arguments[i];  // May prevent optimization
  }
  return total;
}

// Trigger: Leaking arguments
function leak() {
  return arguments;  // Escapes, hard to optimize
}

// Trigger: arguments with arrow functions (doesn't exist, but may confuse)
```

**How to detect**:
```bash
node --trace-opt script.js 2>&1 | grep "arguments"
```

**Mitigation**:

```javascript
// Use rest parameters (modern, optimizable)
function sum(...numbers) {
  let total = 0;
  for (let i = 0; i < numbers.length; i++) {
    total += numbers[i];  // Optimizable
  }
  return total;
}

// Or: explicit parameters if count is known
function sumTwo(a, b) {
  return a + b;
}
```

**Related experiments**: `07-arguments-and-rest`

---

### 7. Prototype Chain Instability

**What it is**: Dynamic changes to prototypes or deep prototype lookups.

**Symptoms**:
- Property access deopts
- IC pollution

**Common triggers**:

```javascript
// Trigger: Modifying prototype after instantiation
function Thing() {}
Thing.prototype.method = function() { /*...*/ };

const obj = new Thing();
obj.method();  // Optimized

// Later...
Thing.prototype.method = function() { /*...*/ };  // Shape change!
obj.method();  // Deopt

// Trigger: Deep prototype chains
const a = { x: 1 };
const b = Object.create(a);
const c = Object.create(b);
const d = Object.create(c);
d.x;  // Multiple lookups, harder to optimize
```

**How to detect**:
```bash
node --trace-ic script.js 2>&1 | grep "prototype"
```

**Mitigation**:

```javascript
// Freeze prototypes after definition
function Thing() {}
Thing.prototype.method = function() { /*...*/ };
Object.freeze(Thing.prototype);

// Prefer flat structures in hot paths
const obj = { x: 1, method() { /*...*/ } };

// Cache prototype methods if called frequently
const method = Thing.prototype.method;
for (const item of items) {
  method.call(item);  // Monomorphic call site
}
```

**Related experiments**: `08-prototypes-and-dynamic-lookup`

---

### 8. Closure Escape Analysis

**What it is**: Closures that prevent stack allocation or other optimizations.

**Symptoms**:
- Increased allocations
- Deopt due to unexpected closure behavior

**Common triggers**:

```javascript
// Trigger: Escaped closure
function outer() {
  let counter = 0;
  return function inner() {
    return ++counter;  // Closure escapes, counter must be heap-allocated
  };
}

// Trigger: Large closure capture
function outer() {
  const hugeArray = new Array(1e6);
  return function inner() {
    return hugeArray[0];  // Entire array kept alive
  };
}
```

**How to detect**:
- Profile for high allocation rates
- `--trace-gc` shows frequent GC

**Mitigation**:

```javascript
// Minimize closure scope
function outer() {
  const hugeArray = new Array(1e6);
  const firstElement = hugeArray[0];  // Capture only what's needed
  return function inner() {
    return firstElement;  // Doesn't keep hugeArray alive
  };
}

// Avoid creating closures in hot loops
// BAD:
for (let i = 0; i < 1e6; i++) {
  const fn = () => i * 2;  // Creates closure every iteration
  process(fn);
}

// GOOD:
function makeMultiplier(i) {
  return i * 2;
}
for (let i = 0; i < 1e6; i++) {
  process(makeMultiplier(i));
}
```

**Related experiments**: `10-closures-escape-analysis`

---

### 9. Bounds Checks & Array Holes

**What it is**: Accessing arrays out of bounds or with holes triggers checks.

**Symptoms**:
- Slower array access
- Deopts on unexpected array states

**Common triggers**:

```javascript
// Trigger: Out of bounds access
const arr = [1, 2, 3];
for (let i = 0; i <= arr.length; i++) {  // Note: <= not <
  console.log(arr[i]);  // Out of bounds on last iteration
}

// Trigger: Holes
const holey = [1, , 3];
for (const el of holey) {
  console.log(el);  // Must check for holes
}
```

**How to detect**:
- Profile array-heavy code
- Check elements kind with `%DebugPrint`

**Mitigation**:

```javascript
// Use correct bounds
for (let i = 0; i < arr.length; i++) {  // Correct
  // V8 can eliminate bounds check if it proves i < length
}

// Avoid holes
const arr = new Array(10).fill(0);  // Packed, no holes

// Filter out holes if unavoidable
const dense = holey.filter(() => true);  // Removes holes
```

**Related experiments**: `11-array-holes-and-bounds-checks`

---

### 10. String Concatenation Patterns

**What it is**: Inefficient string building in loops.

**Symptoms**:
- Slow string operations
- High allocation rate

**Common triggers**:

```javascript
// Trigger: += in loop
let result = "";
for (let i = 0; i < 10000; i++) {
  result += "x";  // Quadratic behavior (O(n²) allocations)
}

// Trigger: Many small concatenations
const s = a + b + c + d + e + f;  // Multiple intermediate strings
```

**How to detect**:
- Profile string-heavy code
- `--trace-gc` shows allocation pressure

**Mitigation**:

```javascript
// Use array + join for loops
const parts = [];
for (let i = 0; i < 10000; i++) {
  parts.push("x");
}
const result = parts.join("");  // Linear time

// Modern V8 optimizes template literals well
const s = `${a}${b}${c}${d}${e}${f}`;  // Better than repeated +

// For complex building, consider string builder pattern
class StringBuilder {
  constructor() {
    this.parts = [];
  }
  append(str) {
    this.parts.push(str);
  }
  toString() {
    return this.parts.join("");
  }
}
```

**Related experiments**: `12-string-concats-and-slices`

---

## Deopts That Are Fine vs. Deopts That Kill

### Fine (Don't Worry)

1. **One-time deopts during warmup**
   - V8 learning, normal behavior
   - Not on hot path yet

2. **Cold path deopts**
   - Error handling
   - Rare edge cases
   - Setup/teardown code

3. **Lazy deopts**
   - Deferred until control returns
   - Less disruptive than eager

### Concerning (Investigate)

1. **Repeated deopts on the same function**
   - Indicates unstable assumptions
   - V8 can't settle on optimized code

2. **Deopts in warm paths**
   - Functions called 100s-1000s of times
   - Accumulates overhead

### Critical (Fix Immediately)

1. **Deopts in hot loops**
   - Inner loops of algorithms
   - Per-request handlers
   - Real-time processing

2. **Megamorphic call sites in hot paths**
   - Silent killer
   - No explicit deopt, just always slow

## Quick Reference Table

| Deopt Trigger | Deopt Reason | Fix |
|---------------|--------------|-----|
| Type mixing | "Not a Smi" | Separate code paths |
| Shape change | "Wrong map" | Consistent initialization |
| Elements kind | "Wrong map" | Homogeneous arrays |
| Many shapes | N/A (megamorphic) | Normalize at boundaries |
| try-catch | Bailout | Isolate to separate function |
| arguments | Bailout | Use rest parameters |
| Prototype change | "Wrong map" | Freeze prototypes |
| Array holes | Various | Avoid holes, use fill() |
| String concat loop | N/A (slow) | Array + join |

## Debugging Workflow

1. **Identify hot paths**
   - Profile your application
   - Find functions that consume most time

2. **Check optimization status**
   - `--trace-opt`: Are hot functions being optimized?

3. **Look for deopts**
   - `--trace-deopt`: Are they deoptimizing?

4. **Find IC states**
   - `--trace-ic`: Are call sites megamorphic?

5. **Hypothesize root cause**
   - Review code for patterns in this bestiary

6. **Create minimal reproduction**
   - Isolate the trigger

7. **Apply mitigation**
   - Test with traces to verify

8. **Measure improvement**
   - Profile before/after

## Further Reading

- Run experiments in this repo to see these patterns in action
- Read `04-patterns-for-stable-performance.md` for proactive strategies
- Check `06-glossary.md` for terminology
