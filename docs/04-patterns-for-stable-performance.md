# Patterns for Stable Performance

## Overview

Proactive patterns that keep V8's optimizer happy. These aren't micro-optimizations—they're **structural principles** that enable consistent, predictable performance.

## Core Philosophy

1. **Stability > cleverness**: Boring, predictable code optimizes well
2. **Hot paths get special treatment**: Not all code is equal
3. **Normalize at boundaries**: Convert chaos to consistency at the edges
4. **Monomorphic call sites**: One type per call site in hot code
5. **Evidence-based**: Verify with profiles, not intuition

## Pattern 1: Consistent Object Shapes

### The Problem

```javascript
// Creates different hidden classes!
function createUser(minimal) {
  if (minimal) {
    return { id: 1, name: "Alice" };
  }
  return { name: "Bob", id: 2, email: "bob@example.com" };
  // Different: property order + different properties
}
```

### The Solution

```javascript
// Always same shape
function createUser(minimal) {
  return {
    id: minimal ? 1 : 2,
    name: minimal ? "Alice" : "Bob",
    email: minimal ? null : "bob@example.com"
  };
  // Same properties, same order, always
}

// Or: use a class (guarantees consistency)
class User {
  constructor(id, name, email = null) {
    this.id = id;
    this.name = name;
    this.email = email;
  }
}
```

### When to Use

- Hot paths: always
- Cold paths: optional
- Objects passed to hot functions
- Return values from frequently-called functions

### Trade-offs

- May use slightly more memory (null properties)
- Worth it for hot paths
- Don't cargo-cult for one-off objects

---

## Pattern 2: Normalize at Boundaries

### The Problem

```javascript
// Hot function receives heterogeneous inputs
function processItem(item) {
  // Item might be: { value: 1 }, { value: 2, extra: 'x' }, { extra: 'y', value: 3 }
  return item.value * 2;  // Megamorphic property access
}

mixedArray.forEach(processItem);  // Many different shapes
```

### The Solution

```javascript
// Normalize inputs at the boundary (cold path)
function normalizeItem(raw) {
  return {
    value: raw.value,
    extra: raw.extra || null
  };
}

// Hot path receives consistent shapes
function processItem(item) {
  return item.value * 2;  // Monomorphic!
}

mixedArray.map(normalizeItem).forEach(processItem);

// Or: normalize in validation layer
function validateAndNormalize(input) {
  // Validation happens once (cold)
  // Returns consistent shape (hot path friendly)
  return {
    id: Number(input.id),
    name: String(input.name),
    email: input.email || null
  };
}
```

### When to Use

- Processing external data (APIs, databases, user input)
- Before entering hot loops
- In request handlers (normalize req.body)

### Trade-offs

- Extra allocation (negligible if outside hot path)
- Simpler hot path code
- Clear boundary between unvalidated/validated data

---

## Pattern 3: Separate Paths for Different Types

### The Problem

```javascript
// Polymorphic function
function double(value) {
  if (typeof value === 'number') {
    return value * 2;
  }
  return Number(value) * 2;
}

// Both code paths in one function
// Call sites see different types
double(5);
double("10");
double(3.14);
```

### The Solution

```javascript
// Separate functions for separate types
function doubleNumber(n) {
  return n * 2;
}

function doubleString(s) {
  return Number(s) * 2;
}

// Router function (cold)
function double(value) {
  if (typeof value === 'number') {
    return doubleNumber(value);
  }
  return doubleString(value);
}

// Hot paths call specific functions directly
for (const num of numbers) {
  result += doubleNumber(num);  // Monomorphic
}
```

### When to Use

- Hot utility functions
- Functions called from multiple contexts
- When profiling shows polymorphism

### Trade-offs

- More code (but clearer)
- Better inlining opportunities
- Easier to reason about types

---

## Pattern 4: Preallocate and Avoid Holes

### The Problem

```javascript
// Creates holes
const arr = [];
arr[100] = 'x';  // HOLEY_ELEMENTS

// Grows array repeatedly
const result = [];
for (let i = 0; i < 10000; i++) {
  result.push(i);  // Grows, reallocates
}

// Sparse array
const sparse = [1, , , , 5];  // HOLEY from start
```

### The Solution

```javascript
// Preallocate if size is known
const arr = new Array(100);
for (let i = 0; i < 100; i++) {
  arr[i] = i;  // Dense, PACKED
}

// Or: preallocate and fill
const zeros = new Array(10000).fill(0);

// Avoid holes
const notSparse = [1, 0, 0, 0, 5];  // PACKED, not HOLEY

// If filtering, create new dense array
const filtered = sparse.filter(() => true);  // Removes holes
```

### When to Use

- Arrays in hot loops
- Large arrays (>100 elements)
- When size is predictable

### Trade-offs

- Upfront allocation cost (usually worth it)
- Memory overhead if over-allocating

---

## Pattern 5: Keep Arrays Homogeneous

### The Problem

```javascript
// Mixed types
const mixed = [1, "two", { three: 3 }, 4.5];  // PACKED_ELEMENTS (slow)

// Numeric array becomes mixed
const numbers = [1, 2, 3];  // PACKED_SMI_ELEMENTS
numbers.push("oops");        // → PACKED_ELEMENTS (degrades)
```

### The Solution

```javascript
// Separate arrays by type
const integers = [1, 2, 3];        // PACKED_SMI_ELEMENTS
const strings = ["a", "b", "c"];   // (specialized for strings)
const objects = [{ x: 1 }, { x: 2 }];  // PACKED_ELEMENTS (but consistent shapes!)

// If you need mixed, start with that assumption
const mixed = [1, "two"];  // Starts as PACKED_ELEMENTS

// Guard against type pollution
function addNumber(arr, n) {
  if (typeof n !== 'number') {
    throw new TypeError('Expected number');
  }
  arr.push(n);
}
```

### When to Use

- Hot path arrays
- Arrays passed to optimized functions (map, filter, reduce)
- Data structures for algorithms

### Trade-offs

- More data structures
- Clearer code (type safety)

---

## Pattern 6: Isolate Try-Catch

### The Problem

```javascript
// try-catch in hot function
function hotPath(data) {
  try {
    // Complex logic here
    return processData(data);
  } catch (e) {
    return fallback();
  }
}

// Called millions of times
for (const item of items) {
  hotPath(item);  // Not fully optimized
}
```

### The Solution

```javascript
// Separate hot path from error handling
function hotPath(data) {
  return processData(data);  // Fully optimizable
}

function safeHotPath(data) {
  try {
    return hotPath(data);
  } catch (e) {
    return fallback();
  }
}

// If errors are rare, use safe version
for (const item of items) {
  safeHotPath(item);
}

// If errors never happen in practice, use hot version directly
for (const item of validatedItems) {
  hotPath(item);  // Maximum performance
}
```

### When to Use

- Hot loops with try-catch
- Functions called per-request
- Performance-critical error handling

### Trade-offs

- Extra function call (usually inlined)
- Clearer separation of concerns

---

## Pattern 7: Avoid Delete, Use Null

### The Problem

```javascript
const obj = { x: 1, y: 2, z: 3 };
delete obj.y;  // Shape change + may enter dictionary mode
```

### The Solution

```javascript
const obj = { x: 1, y: 2, z: 3 };
obj.y = null;  // or undefined - preserves shape

// Or: create new object without property
const { y, ...rest } = obj;  // rest = { x: 1, z: 3 }

// Or: use Map for truly dynamic keys
const map = new Map([['x', 1], ['y', 2], ['z', 3]]);
map.delete('y');  // Maps are designed for this
```

### When to Use

- Objects in hot paths
- Cached objects
- Objects passed to hot functions

### Trade-offs

- Memory overhead (null properties)
- Worth it to preserve shape stability

---

## Pattern 8: Use Rest Parameters, Not Arguments

### The Problem

```javascript
function sum() {
  let total = 0;
  for (let i = 0; i < arguments.length; i++) {
    total += arguments[i];
  }
  return total;
}
```

### The Solution

```javascript
function sum(...numbers) {
  let total = 0;
  for (let i = 0; i < numbers.length; i++) {
    total += numbers[i];
  }
  return total;
}

// Or: if arg count is known, use explicit parameters
function sum3(a, b, c) {
  return a + b + c;  // Fastest
}
```

### When to Use

- Always prefer rest over arguments
- Use explicit parameters if count is fixed

### Trade-offs

- Rest has minimal overhead in modern V8
- Much more optimizable than arguments

---

## Pattern 9: Cache Prototype Methods

### The Problem

```javascript
// Looks up prototype every iteration
for (const item of items) {
  item.method();  // Prototype lookup
}
```

### The Solution

```javascript
// Cache the method
const method = Item.prototype.method;
for (const item of items) {
  method.call(item);  // Direct call, monomorphic
}

// Or: bind once
const boundMethod = item.method.bind(item);
// Use boundMethod many times
```

### When to Use

- Hot loops calling methods
- Callback-heavy code

### Trade-offs

- Slightly less readable
- Significant for hot paths

---

## Pattern 10: Flatten Object Hierarchies (Hot Paths)

### The Problem

```javascript
// Deep nesting
const user = {
  profile: {
    settings: {
      theme: 'dark'
    }
  }
};

// Hot path
function getTheme(user) {
  return user.profile.settings.theme;  // Multiple lookups
}
```

### The Solution

```javascript
// Flatten for hot paths
function getUserTheme(user) {
  return user.theme;  // Direct access
}

// Or: cache nested access
const theme = user.profile.settings.theme;
// Use theme many times

// Or: denormalize for hot data
const hotData = {
  id: user.id,
  name: user.profile.name,
  theme: user.profile.settings.theme
};
```

### When to Use

- Data accessed in hot loops
- Per-request data structures
- After profiling shows nested access overhead

### Trade-offs

- Data duplication
- Must keep in sync
- Worth it for hot paths

---

## Pattern 11: Initialize Object Properties in Constructor Order

### The Problem

```javascript
class Point {
  constructor(x, y, z) {
    this.y = y;  // Out of order
    this.x = x;
    this.z = z;
  }
}
```

### The Solution

```javascript
class Point {
  constructor(x, y, z) {
    this.x = x;  // Alphabetical (or any consistent order)
    this.y = y;
    this.z = z;
  }
}

// Or: use field declarations (modern)
class Point {
  x = 0;
  y = 0;
  z = 0;

  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}
```

### When to Use

- All classes/constructors
- Low cost, high benefit

### Trade-offs

- None, just discipline

---

## Pattern 12: String Building with Arrays

### The Problem

```javascript
let html = "";
for (const item of items) {
  html += `<li>${item}</li>`;  // Quadratic allocations
}
```

### The Solution

```javascript
const parts = [];
for (const item of items) {
  parts.push(`<li>${item}</li>`);
}
const html = parts.join("");  // Linear time

// Modern V8 optimizes this well too:
const html = items.map(item => `<li>${item}</li>`).join("");
```

### When to Use

- Building strings in loops
- Template generation
- Concatenating many strings

### Trade-offs

- Slightly more verbose
- Much faster for large loops

---

## Hot Path Discipline Checklist

When writing hot path code, ask:

- [ ] Do all objects have consistent shapes?
- [ ] Are call sites monomorphic (one type)?
- [ ] Are arrays homogeneous and packed?
- [ ] Is try-catch isolated to wrapper functions?
- [ ] Are rest parameters used instead of arguments?
- [ ] Are properties initialized in consistent order?
- [ ] Are delete operations avoided?
- [ ] Are inputs normalized at boundaries?
- [ ] Has profiling confirmed this is actually hot?

## When NOT to Apply These Patterns

1. **Cold code**: Setup, teardown, error paths
2. **Before profiling**: Don't optimize without evidence
3. **Premature abstraction**: Don't sacrifice clarity for unmeasured gains
4. **One-off code**: Scripts, utilities, non-production

## Measuring Success

Before and after applying patterns:

1. **Run with traces**:
   ```bash
   node --trace-opt --trace-deopt --trace-ic script.js
   ```

2. **Check for**:
   - Functions marked for optimization
   - No deopts on hot paths
   - Monomorphic IC states

3. **Profile**:
   ```bash
   node --cpu-prof script.js
   ```

4. **Compare timings**:
   - 10-50% improvement: typical
   - 2-10x improvement: if fixing megamorphism
   - <10% improvement: might not be worth it

## Summary

These patterns aren't tricks—they're **coding discipline** that aligns with how V8 optimizes. Apply them deliberately to hot paths, verify with evidence, and ignore them on cold paths.

**Remember**: Stable, predictable code is fast code.

## Further Reading

- Run experiments in this repo to see patterns in action
- Read `03-deopt-bestiary.md` for anti-patterns
- Profile your own code to find hot paths
