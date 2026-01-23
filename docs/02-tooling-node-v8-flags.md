# Tooling: Node.js and V8 Flags

## Overview

V8 exposes powerful diagnostic flags that let you observe the optimization process. This guide covers the essential flags, what they reveal, common pitfalls, and practical recipes.

## The Essential Flags

### 1. `--trace-opt`

**What it does**: Logs tiering events for optimizing compilers (Maglev and TurboFan).

**Output example**:
```
[marking 0x1234abcd <JSFunction hot> for optimization to MAGLEV, ConcurrencyMode::kConcurrent, reason: hot and stable]
[compiling method 0x1234abcd <JSFunction hot> (target MAGLEV), mode: ConcurrencyMode::kConcurrent]
[completed optimizing 0x1234abcd <JSFunction hot> (target MAGLEV)]
[marking 0x1234abcd <JSFunction hot> for optimization to TURBOFAN, ConcurrencyMode::kConcurrent, reason: OSR after Maglev]
[compiling method 0x1234abcd <JSFunction hot> (target TURBOFAN) OSR, mode: ConcurrencyMode::kConcurrent]
```

**When to use**: Confirm that hot functions are graduating past Sparkplug; inspect whether Maglev ever kicks in before TurboFan.

**Usage**:
```bash
# Default Node builds currently only tier to TurboFan.
node --trace-opt script.js

# Force-enable Maglev or clamp the highest tier for experiments.
node --maglev --trace-opt script.js
node --maglev --max-opt=2 --trace-opt script.js  # limit to Maglev
```

> `--trace-opt` does **not** log Sparkplug baseline compilations. Pair it with `--trace-baseline` if you care about those events.

### 2. `--trace-baseline`

**What it does**: Traces Sparkplug (baseline) compilation batches so you can see when Ignition hands off to native baseline code.

**Output example**:
```
[Baseline batch compilation] Enqueued SFI hot with estimated size 96 (current budget: 420/4096)
[Baseline batch compilation] Compiling current batch of 5 functions
[compiling method 0x1a2b3c4d <SharedFunctionInfo hot> (target BASELINE)]
[completed compiling 0x1a2b3c4d <SharedFunctionInfo hot> (target BASELINE) - took 0.045 ms]
```

**When to use**: Verify that Sparkplug is actually on for your Node build, or to time how long baseline compilation takes before Maglev/TurboFan become eligible.

**Usage**:
```bash
node --trace-baseline script.js
node --trace-baseline --trace-opt script.js  # baseline + Maglev/TurboFan
```

### 3. `--trace-deopt`

**What it does**: Logs when optimized code deopts and why.

**Output example**:
```
[deoptimizing (DEOPT eager): begin 0x1234abcd <JSFunction add> @2]
    Reason: Insufficient type feedback
[deoptimizing (DEOPT eager): end 0x1234abcd <JSFunction add>]
```

**When to use**: Debug performance regressions; find deopt triggers.

**Usage**:
```bash
node --trace-deopt script.js
```

**Deopt reasons** (common):
- `Insufficient type feedback`: Not enough data to optimize
- `Wrong map`: Object shape changed
- `Not a Smi`: Expected integer, got float or object
- `DivisionByZero`: Division by zero check failed
- `Overflow`: Integer overflow

### 4. `--trace-ic`

**What it does**: Logs inline cache state transitions.

**Output example**:
```
[LoadIC in ~add+32 at script.js:5 obj.x (0->.) map=0xabcd1234 transition to MONOMORPHIC]
[LoadIC in ~process+12 at script.js:10 obj.value (1->.) map=0xef567890 transition to POLYMORPHIC]
[LoadIC in ~log+8 at script.js:15 obj.msg (.->.) transition to MEGAMORPHIC]
```

**When to use**: Diagnose megamorphism; understand property access patterns.

**Usage**:
```bash
node --trace-ic script.js 2>&1 | grep MEGAMORPHIC
```

**IC States**:
- `UNINITIALIZED` (0): Never executed
- `MONOMORPHIC` (1): One shape seen (fast!)
- `POLYMORPHIC` (2-4): Few shapes seen (okay)
- `MEGAMORPHIC` (5+): Many shapes seen (slow!)

### 5. `--cpu-prof` / `--cpu-prof-dir`

**What it does**: Generates CPU profiles (Chrome DevTools format).

**Usage**:
```bash
node --cpu-prof --cpu-prof-dir=./profiles script.js
```

**Output**: `CPU.<timestamp>.cpuprofile`

**Viewing**:
1. Open Chrome DevTools
2. Go to Performance tab (or Profiler in older versions)
3. Click "Load profile"
4. Select the `.cpuprofile` file

**When to use**: Identify hot functions; see time distribution.

### 6. `--prof` / `--prof-process`

**What it does**: V8's built-in statistical profiler.

**Usage**:
```bash
# Generate profile
node --prof script.js

# Process the log
node --prof-process isolate-*.log > processed.txt
```

**Output**: Shows ticks (samples) per function.

**When to use**: Alternative to `--cpu-prof`; more V8-specific details.

**Note**: Noisier than `--cpu-prof`; requires post-processing.

### 7. `--allow-natives-syntax`

**What it does**: Enables V8 intrinsic functions like `%OptimizeFunctionOnNextCall()`.

**DANGER**: Non-standard, non-portable, V8-specific. Never use in production.

**Usage** (experiments only):
```javascript
// Only in isolated test scripts!
function hot() { /*...*/ }

hot(); hot(); hot();  // Warm up

%PrepareFunctionForOptimization(hot);
%OptimizeFunctionOnNextCall(hot);
hot();  // This call will compile

%OptimizeFunctionOnNextCall(hot);
hot();  // Verify optimized

const status = %GetOptimizationStatus(hot);
// Stable bits across recent Node versions:
//   status & 1: is function (always 1)
//   status & 2: is never optimize
//   status & 4: is always optimize
//   status & 8: is maybe deoptimized
//   status & 16: is optimized (Sparkplug or higher)
// Tier-specific bits (Maglev/TurboFan) move around. Inspect
// deps/v8/src/runtime/runtime.h for the release you're targeting.
```

**When to use**: Force optimization for controlled experiments.

**Why it's dangerous**:
- Not available in production Node
- Breaks portability
- Encourages testing unrealistic scenarios

**Better approach**: Let V8 optimize naturally with enough warmup iterations.

### 8. `--print-opt-code` / `--code-comments`

**What it does**: Prints generated machine code (assembly).

**Usage**:
```bash
node --print-opt-code --code-comments script.js > asm.txt
```

**When to use**: Advanced analysis; verify code generation.

**Warning**: Very verbose; requires assembly knowledge.

### 9. `--trace-turbo`

**What it does**: Dumps TurboFan compiler intermediate representations.

**Usage**:
```bash
node --trace-turbo script.js
```

**Output**: JSON files with compiler IR graphs.

**When to use**: Deep compiler debugging (rarely needed).

## Combining Flags

Typical combinations:

```bash
# See optimization + deoptimization
node --trace-opt --trace-deopt script.js

# Full IC + opt/deopt picture
node --trace-ic --trace-opt --trace-deopt script.js 2>&1 | tee trace.log

# Profile + trace
node --cpu-prof --trace-deopt script.js
```

## Interpreting Output

### Reading Optimization Traces

**Sparkplug (`--trace-baseline`)**
```
[compiling method 0x1a2b3c4d <SharedFunctionInfo hot> (target BASELINE)]
```
- `target BASELINE`: Sparkplug compiled native code from bytecode
- These lines appear in batches because Sparkplug compiles groups of functions at a time
- Pair with `--trace-baseline-batch-compilation` for more context about the queue size

**Maglev/TurboFan (`--trace-opt`)**
```
[marking 0x1a2b3c4d <JSFunction hot> for optimization to MAGLEV, ConcurrencyMode::kConcurrent, reason: hot and stable]
[compiling method 0x1a2b3c4d <JSFunction hot> (target MAGLEV), mode: ConcurrencyMode::kConcurrent]
[completed optimizing 0x1a2b3c4d <JSFunction hot> (target MAGLEV)]
[marking 0x1a2b3c4d <JSFunction hot> for optimization to TURBOFAN, ConcurrencyMode::kConcurrent, reason: OSR after Maglev]
```
- `marking`: Function queued for optimization beyond Sparkplug
- `target MAGLEV` or `target TURBOFAN`: Which optimizing compiler produced the code
- `OSR`: On-stack replacement; V8 swapped tiers in the middle of a long-running loop
- `reason`: Heuristic that triggered tiering (hot and stable, osr after Maglev, etc.)

**Good sign**: Functions jump to Sparkplug quickly, then tier up predictably as they get hotter.

### Reading Deopt Traces

```
[deoptimizing (DEOPT eager): begin 0x1a2b3c4d <JSFunction hot> (opt #42) @8, FP to SP delta: 48, caller sp: 0x7ffe...]
    Reason: Wrong map
    Deopt position: 152
[deoptimizing (DEOPT eager): end 0x1a2b3c4d <JSFunction hot>]
```

- `DEOPT eager`: Immediate deopt (vs. `lazy`)
- `Wrong map`: The trigger (object shape mismatch)
- `@8`: Bytecode offset
- `opt #42`: Optimization attempt number

**Bad sign**: Repeated deopts of the same function.

### Reading IC Traces

```
[LoadIC in ~getX+24 at test.js:10 (obj.x) (0->1) map=0x12ab34cd MONOMORPHIC]
```

- `LoadIC`: Property load
- `getX+24`: Function + bytecode offset
- `test.js:10`: Source location
- `obj.x`: Property access
- `(0->1)`: State transition (uninit → mono)
- `MONOMORPHIC`: Now monomorphic (good!)

```
[LoadIC in ~process+12 at test.js:15 (obj.value) (1->.) POLYMORPHIC]
```

- `(1->.)`: Was monomorphic, now polymorphic
- `POLYMORPHIC`: 2-4 shapes seen (okay)

```
[LoadIC in ~log+8 at test.js:20 (obj.msg) (.->.) MEGAMORPHIC]
```

- `MEGAMORPHIC`: 5+ shapes, gave up (bad!)

## Common Pitfalls

### 1. Not Enough Warmup

V8 needs time to collect feedback and optimize.

**Wrong**:
```javascript
function hot() { /*...*/ }
hot();  // One call
// Measure - not optimized yet!
```

**Right**:
```javascript
function hot() { /*...*/ }

// Warmup
for (let i = 0; i < 10000; i++) {
  hot();
}

// Now measure
for (let i = 0; i < 100000; i++) {
  hot();
}
```

**Rule of thumb**: 1000-10000 warmup iterations for small functions.

### 2. Dead Code Elimination

V8 is smart. If your loop does nothing, it removes it.

**Wrong**:
```javascript
for (let i = 0; i < 1e6; i++) {
  add(i, i);  // Result discarded → V8 removes the loop!
}
```

**Right**:
```javascript
let sum = 0;
for (let i = 0; i < 1e6; i++) {
  sum += add(i, i);  // Result used → loop stays
}
console.log(sum);  // Prevent further optimization
```

### 3. Trace Noise

Traces are verbose. Filter strategically:

```bash
# Only deopts
node --trace-deopt script.js 2>&1 | grep -A 2 "deoptimizing"

# Only Sparkplug batches
node --trace-baseline script.js 2>&1 | grep "(target BASELINE)"

# Only megamorphic transitions
node --trace-ic script.js 2>&1 | grep MEGAMORPHIC

# Specific function tiering
node --trace-opt script.js 2>&1 | grep "hot"
```

### 4. Timing Variability

First run may include JIT overhead. Always:
1. Warmup
2. Measure multiple times
3. Report median or best-of-N

### 5. Version Differences

V8 evolves. Behavior on Node 18 may differ from Node 20.

**Always document**:
```javascript
console.log(`Node: ${process.version}`);
console.log(`V8: ${process.versions.v8}`);
```

## Practical Recipes

### Recipe 1: "I want to see if my function optimizes"

```bash
# Sparkplug events
node --trace-baseline script.js 2>&1 | grep "yourFunctionName"

# Maglev/TurboFan events
node --trace-opt script.js 2>&1 | grep "marking.*yourFunctionName"
```

If you see baseline + `marking ...` lines, the function is marching through the tiering pipeline.

### Recipe 2: "I want to see why my function deopts"

```bash
node --trace-deopt script.js 2>&1 | grep -A 5 "yourFunctionName"
```

Look for `Reason: ...` in the output.

### Recipe 3: "I want to find megamorphic call sites"

```bash
node --trace-ic script.js 2>&1 | grep MEGAMORPHIC
```

Each line shows a property access that became megamorphic.

### Recipe 4: "I want a CPU profile"

```bash
node --cpu-prof --cpu-prof-dir=./profiles script.js
```

Open resulting `.cpuprofile` in Chrome DevTools.

### Recipe 5: "I want to see allocation/GC hints"

```bash
node --trace-gc script.js
```

Shows garbage collection pauses:
```
[GC (Allocation Failure) 12.3 -> 5.1 MB, 2.5 ms]
```

### Recipe 6: "I want to force optimization (experiments only)"

```javascript
// EXPERIMENTS ONLY - NOT PRODUCTION
function hot() { /*...*/ }

// Warmup
for (let i = 0; i < 100; i++) hot();

// Force optimize (requires --allow-natives-syntax)
%OptimizeFunctionOnNextCall(hot);
hot();

const status = %GetOptimizationStatus(hot);
const kIsOptimized = 1 << 4;  // Sparkplug or higher

console.log({ status, optimized: !!(status & kIsOptimized) });
```

> To differentiate Maglev vs. TurboFan bits, inspect `deps/v8/src/runtime/runtime.h`
> for the Node release you're targeting; the bit layout shifts frequently.

Run:
```bash
# Force TurboFan (default OptimizeFunctionOnNextCall behavior)
node --allow-natives-syntax script.js

# Force Maglev (Node 20+/V8 11+ builds only)
node --allow-natives-syntax --maglev --optimize-on-next-call-optimizes-to-maglev script.js
```

### Recipe 7: "I want to compare optimized vs. deopt timings"

```bash
# Baseline (should optimize)
node --trace-opt baseline.js 2>&1 | tee baseline.log

# Deopt variant
node --trace-deopt deopt.js 2>&1 | tee deopt.log

# Compare timings + check for deopts
grep "Time:" baseline.log deopt.log
grep "deoptimizing" deopt.log
```

## Best Practices

1. **Use traces for diagnosis, not production**
   - They slow down execution significantly
   - Verbose output

2. **Isolate experiments**
   - One variable at a time
   - Minimal reproducible case

3. **Separate warmup from measurement**
   - Clear phases in your benchmark

4. **Document environment**
   - Node version
   - OS
   - CPU (matters for JIT)

5. **Don't cargo cult `--allow-natives-syntax`**
   - Use only for controlled experiments
   - Never in real code

6. **Automate trace parsing**
   - Grep/awk for specific patterns
   - See `scripts/summarize-results.js` for examples

## Tools Beyond Flags

### Chrome DevTools

Attach to running Node process:

```bash
node --inspect-brk script.js
```

Open `chrome://inspect` in Chrome.

**Capabilities**:
- CPU profiling
- Heap snapshots
- Live debugging

### clinic.js

Third-party tooling for Node performance:

```bash
npm install -g clinic
clinic doctor -- node script.js
```

**Provides**: Flame graphs, event loop analysis, memory profiling.

### 0x

Flame graph profiler:

```bash
npm install -g 0x
0x script.js
```

**Provides**: Interactive flame graphs.

## Summary

| Flag | Purpose | Output |
|------|---------|--------|
| `--trace-opt` | See optimizations | Logs when functions are compiled |
| `--trace-deopt` | See deopts | Logs deopts + reasons |
| `--trace-ic` | See IC states | Logs IC transitions |
| `--cpu-prof` | CPU profile | `.cpuprofile` file |
| `--trace-gc` | See GC | Logs garbage collection |
| `--allow-natives-syntax` | V8 intrinsics | Enables `%` functions |
| `--print-opt-code` | See asm | Assembly output |

**Golden combo for learning**:
```bash
node --trace-opt --trace-deopt --trace-ic script.js 2>&1 | tee trace.log
```

## Next Steps

- Run experiments with traces enabled
- Practice reading trace output
- Correlate traces with code behavior
- Read `03-deopt-bestiary.md` to understand common deopt patterns
