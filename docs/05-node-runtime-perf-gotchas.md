# Node.js Runtime Performance Gotchas

## Overview

Beyond V8 optimization, Node.js has runtime-specific performance considerations: GC, async/await overhead, buffers, event loop behavior, and common service-level pitfalls.

## 1. Garbage Collection & Allocation Pressure

### The Problem

Node.js uses V8's garbage collector. Excessive allocations cause frequent GC pauses, hurting throughput and latency.

```javascript
// BAD: Creates many temporary objects
function processRequests(requests) {
  return requests.map(req => {
    return {  // New object every iteration
      id: req.id,
      processed: true,
      timestamp: Date.now()
    };
  });
}

// BAD: String concatenation in loop
app.get('/logs', (req, res) => {
  let output = '';
  for (const log of logs) {
    output += log + '\n';  // O(n²) allocations
  }
  res.send(output);
});
```

### How to Detect

```bash
node --trace-gc script.js
```

Look for:
- Frequent GC: `[GC ...]` lines every few ms
- Large heap deltas: `50MB -> 100MB` growth
- Long pause times: `> 10ms` pauses

```javascript
// Programmatic GC monitoring
const v8 = require('v8');

setInterval(() => {
  const heapStats = v8.getHeapStatistics();
  console.log({
    used: (heapStats.used_heap_size / 1024 / 1024).toFixed(2) + ' MB',
    total: (heapStats.total_heap_size / 1024 / 1024).toFixed(2) + ' MB',
    limit: (heapStats.heap_size_limit / 1024 / 1024).toFixed(2) + ' MB'
  });
}, 5000);
```

### Solutions

**Object pooling for hot paths**:
```javascript
class ObjectPool {
  constructor(factory, size = 100) {
    this.factory = factory;
    this.pool = Array.from({ length: size }, factory);
    this.available = size;
  }

  acquire() {
    if (this.available > 0) {
      return this.pool[--this.available];
    }
    return this.factory();  // Pool exhausted, allocate
  }

  release(obj) {
    if (this.available < this.pool.length) {
      this.pool[this.available++] = obj;
    }
  }
}

// Usage
const responsePool = new ObjectPool(() => ({
  id: null,
  processed: false,
  timestamp: 0
}));

function processRequest(req) {
  const resp = responsePool.acquire();
  resp.id = req.id;
  resp.processed = true;
  resp.timestamp = Date.now();
  // Use resp...
  responsePool.release(resp);
}
```

**Reuse buffers**:
```javascript
// BAD
function handleData(data) {
  const buffer = Buffer.from(data);  // New allocation
  return buffer.toString('utf8');
}

// GOOD (if size is predictable)
const sharedBuffer = Buffer.allocUnsafe(4096);

function handleData(data) {
  data.copy(sharedBuffer);
  return sharedBuffer.toString('utf8', 0, data.length);
}
```

**Avoid intermediate allocations**:
```javascript
// BAD
const processed = items
  .filter(x => x.active)
  .map(x => ({ ...x, processed: true }))  // Spread creates new objects
  .filter(x => x.valid);

// GOOD
const processed = [];
for (const item of items) {
  if (item.active && item.valid) {
    item.processed = true;
    processed.push(item);
  }
}
```

---

## 2. Async/Await & Microtask Overhead

### The Problem

Every `await` creates microtasks and promise machinery. In tight loops, this overhead accumulates.

```javascript
// Overhead example
async function processItems(items) {
  for (const item of items) {
    await processOne(item);  // Microtask overhead per iteration
  }
}

// Called with 10,000 items → 10,000 microtasks
```

### How to Detect

Profile with `--cpu-prof` and look for time in microtask queue processing.

### Solutions

**Batch processing**:
```javascript
// Process in batches, not one-by-one
async function processItems(items, batchSize = 100) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(processOne));
  }
}
```

**Avoid async when unnecessary**:
```javascript
// BAD: Async for synchronous work
async function double(x) {
  return x * 2;
}

// GOOD
function double(x) {
  return x * 2;
}

// Use async only when actually waiting
async function fetchAndDouble(url) {
  const data = await fetch(url);
  return data.value * 2;
}
```

**Defer to next tick strategically**:
```javascript
// BAD: Blocking event loop
function processHuge(data) {
  // Synchronous 100ms operation
  return heavyComputation(data);
}

// GOOD: Break into chunks
async function processHuge(data) {
  const chunks = chunkify(data);
  const results = [];

  for (const chunk of chunks) {
    results.push(heavyComputation(chunk));
    await setImmediate(() => {});  // Yield to event loop
  }

  return results.flat();
}

// Helper
function setImmediate(fn) {
  return new Promise(resolve => {
    process.nextTick(() => {
      fn?.();
      resolve();
    });
  });
}
```

---

## 3. Buffer vs. TypedArray vs. Plain Array

### Performance Characteristics

| Type | Use Case | Speed | Memory |
|------|----------|-------|--------|
| `Buffer` | Binary data, I/O | Fast | Efficient |
| `Uint8Array` | Binary, portable | Fast | Efficient |
| `Array` | Mixed types | Slow | Wasteful for numbers |

### The Problem

```javascript
// BAD: Using Array for binary data
const data = [0x01, 0x02, 0x03];  // Each element is a heap number!

// BAD: Creating new Buffers repeatedly
for (const msg of messages) {
  const buf = Buffer.from(msg);  // Allocation per iteration
  socket.write(buf);
}
```

### Solutions

```javascript
// GOOD: Buffer for binary I/O
const data = Buffer.from([0x01, 0x02, 0x03]);

// GOOD: TypedArray for numeric computation
const numbers = new Float64Array(10000);
for (let i = 0; i < numbers.length; i++) {
  numbers[i] = Math.random();
}

// GOOD: Reuse Buffer for writes
const writeBuffer = Buffer.allocUnsafe(1024);
for (const msg of messages) {
  const len = writeBuffer.write(msg);
  socket.write(writeBuffer.slice(0, len));
}
```

**Buffer pooling**:
```javascript
class BufferPool {
  constructor(bufferSize = 4096, poolSize = 50) {
    this.pool = [];
    this.bufferSize = bufferSize;

    for (let i = 0; i < poolSize; i++) {
      this.pool.push(Buffer.allocUnsafe(bufferSize));
    }
  }

  acquire() {
    return this.pool.pop() || Buffer.allocUnsafe(this.bufferSize);
  }

  release(buf) {
    if (this.pool.length < 100) {  // Cap pool size
      this.pool.push(buf);
    }
  }
}

const bufferPool = new BufferPool();

function handleRequest(data) {
  const buf = bufferPool.acquire();
  try {
    // Use buffer...
    return processWithBuffer(buf, data);
  } finally {
    bufferPool.release(buf);
  }
}
```

---

## 4. JSON.parse and Object Shape Variance

### The Problem

`JSON.parse` can produce objects with varying shapes if JSON structure varies. This poisons inline caches.

```javascript
// Input JSON with varying structure
const json1 = '{"id":1,"name":"Alice"}';
const json2 = '{"name":"Bob","id":2,"email":"bob@example.com"}';  // Different order + extra field

function process(jsonStr) {
  const obj = JSON.parse(jsonStr);
  return obj.id + obj.name.length;  // Property access becomes polymorphic
}

process(json1);
process(json2);  // Different shape!
```

### Solutions

**Normalize after parsing**:
```javascript
function parseAndNormalize(jsonStr) {
  const raw = JSON.parse(jsonStr);
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email || null  // Always same shape
  };
}

function process(jsonStr) {
  const obj = parseAndNormalize(jsonStr);
  return obj.id + obj.name.length;  // Monomorphic
}
```

**Use schema validation**:
```javascript
// Ensure consistent structure
function validateUser(raw) {
  if (typeof raw.id !== 'number' || typeof raw.name !== 'string') {
    throw new Error('Invalid user');
  }

  return {
    id: raw.id,
    name: raw.name,
    email: raw.email || null
  };
}

function processUser(jsonStr) {
  const user = validateUser(JSON.parse(jsonStr));
  // user has guaranteed consistent shape
}
```

---

## 5. Event Loop & Blocking Operations

### The Problem

Long synchronous operations block the event loop, delaying all other I/O.

```javascript
// BAD: Blocking JSON parse of large payload
app.post('/upload', (req, res) => {
  const data = JSON.parse(req.body);  // 10MB JSON, blocks for 100ms
  res.send({ ok: true });
});

// Meanwhile: all other requests wait 100ms
```

### How to Detect

```javascript
// Monitor event loop lag
const start = process.hrtime.bigint();
setInterval(() => {
  const delta = Number(process.hrtime.bigint() - start) / 1e6;
  const expected = 1000;
  const lag = delta - expected;

  if (lag > 100) {
    console.warn(`Event loop lag: ${lag.toFixed(2)}ms`);
  }

  start = process.hrtime.bigint();
}, 1000);
```

### Solutions

**Offload to worker threads**:
```javascript
const { Worker } = require('worker_threads');

function parseInWorker(jsonStr) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(`
      const { parentPort, workerData } = require('worker_threads');
      const parsed = JSON.parse(workerData);
      parentPort.postMessage(parsed);
    `, { eval: true, workerData: jsonStr });

    worker.on('message', resolve);
    worker.on('error', reject);
  });
}

app.post('/upload', async (req, res) => {
  const data = await parseInWorker(req.body);  // Offloaded, event loop free
  res.send({ ok: true });
});
```

**Break into chunks** (for CPU-heavy work):
```javascript
async function processLargeArray(items) {
  const results = [];
  const chunkSize = 1000;

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);

    for (const item of chunk) {
      results.push(processOne(item));
    }

    // Yield to event loop every 1000 items
    await new Promise(resolve => setImmediate(resolve));
  }

  return results;
}
```

---

## 6. Logging as a Hidden Performance Sink

### The Problem

Excessive logging, especially with complex serialization, kills performance.

```javascript
// BAD: Logging in hot path
function processRequest(req) {
  console.log('Processing:', JSON.stringify(req));  // Serialization cost
  const result = doWork(req);
  console.log('Result:', JSON.stringify(result));
  return result;
}

// Called 1000 req/sec → 2000 log lines/sec + serialization overhead
```

### Solutions

**Log levels**:
```javascript
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const levels = { debug: 0, info: 1, warn: 2, error: 3 };

function log(level, message, data) {
  if (levels[level] >= levels[LOG_LEVEL]) {
    console.log(`[${level}] ${message}`, data);
  }
}

function processRequest(req) {
  log('debug', 'Processing', req);  // Only if LOG_LEVEL=debug
  return doWork(req);
}
```

**Lazy serialization**:
```javascript
function log(level, message, dataFn) {
  if (levels[level] >= levels[LOG_LEVEL]) {
    console.log(`[${level}] ${message}`, dataFn());  // Only serialize if logged
  }
}

log('debug', 'Request', () => JSON.stringify(req));  // Lazy
```

**Sampling**:
```javascript
let requestCount = 0;

function processRequest(req) {
  const shouldLog = (requestCount++ % 100) === 0;  // Log 1% of requests

  if (shouldLog) {
    console.log('Sample request:', req.id);
  }

  return doWork(req);
}
```

---

## 7. Module Resolution & Require Overhead

### The Problem

First `require()` of a module is expensive (parsing, compilation). Repeated requires are cached but still have lookup cost.

### Solutions

**Preload at startup**:
```javascript
// app.js
const express = require('express');
const db = require('./db');
const utils = require('./utils');
// ... preload all modules at startup

app.listen(3000, () => {
  console.log('Server ready');  // All modules loaded
});
```

**Avoid require in hot paths**:
```javascript
// BAD
app.get('/data', (req, res) => {
  const processor = require('./processor');  // Don't require per-request
  res.json(processor.process(req.query));
});

// GOOD
const processor = require('./processor');  // Once, at top

app.get('/data', (req, res) => {
  res.json(processor.process(req.query));
});
```

---

## 8. RegExp Compilation

### The Problem

Creating RegExp objects repeatedly is wasteful.

```javascript
// BAD
function validate(input) {
  return /^[a-z]+$/.test(input);  // Creates new RegExp each call
}
```

### Solutions

```javascript
// GOOD: Reuse RegExp
const LOWERCASE_PATTERN = /^[a-z]+$/;

function validate(input) {
  return LOWERCASE_PATTERN.test(input);
}

// For dynamic patterns, cache them
const regexCache = new Map();

function getRegex(pattern) {
  if (!regexCache.has(pattern)) {
    regexCache.set(pattern, new RegExp(pattern));
  }
  return regexCache.get(pattern);
}
```

---

## 9. Stream Back-Pressure

### The Problem

Not respecting stream back-pressure causes memory bloat.

```javascript
// BAD
function pipeData(readStream, writeStream) {
  readStream.on('data', chunk => {
    writeStream.write(chunk);  // Ignores back-pressure
  });
}
```

### Solutions

```javascript
// GOOD: Respect back-pressure
function pipeData(readStream, writeStream) {
  readStream.on('data', chunk => {
    const canContinue = writeStream.write(chunk);
    if (!canContinue) {
      readStream.pause();  // Pause reading when writer is overwhelmed
    }
  });

  writeStream.on('drain', () => {
    readStream.resume();  // Resume when writer is ready
  });
}

// BETTER: Use .pipe() (handles back-pressure)
readStream.pipe(writeStream);
```

---

## 10. Promise Anti-Patterns

### The Problem

```javascript
// BAD: Unnecessary Promise wrapping
async function getUser(id) {
  return new Promise(resolve => {
    resolve(db.findUser(id));  // db.findUser already returns Promise
  });
}

// BAD: Not returning Promise in .then()
fetch('/api/data')
  .then(res => {
    res.json();  // Forgot to return!
  })
  .then(data => {
    console.log(data);  // undefined
  });
```

### Solutions

```javascript
// GOOD
async function getUser(id) {
  return db.findUser(id);  // Just return the Promise
}

// GOOD
fetch('/api/data')
  .then(res => res.json())
  .then(data => console.log(data));

// Or with async/await
async function fetchData() {
  const res = await fetch('/api/data');
  const data = await res.json();
  console.log(data);
}
```

---

## Quick Reference: Node Perf Checklist

### Before Deploying

- [ ] Profiled with `--cpu-prof` to find hot paths
- [ ] Checked GC frequency with `--trace-gc`
- [ ] Ensured no blocking operations in request handlers
- [ ] Logging is minimal/sampled in production
- [ ] Buffers/arrays are reused where possible
- [ ] JSON parsing is normalized or validated for consistent shapes
- [ ] Async/await overhead is acceptable (or batched)
- [ ] Worker threads used for CPU-heavy tasks
- [ ] Stream back-pressure is respected
- [ ] Modules loaded at startup, not per-request

### Monitoring in Production

```javascript
// Heap usage
const heapUsed = process.memoryUsage().heapUsed / 1024 / 1024;

// Event loop lag
const start = process.hrtime.bigint();
setImmediate(() => {
  const lag = Number(process.hrtime.bigint() - start) / 1e6;
  // Log if lag > threshold
});

// GC stats (requires node --expose-gc)
if (global.gc) {
  const before = process.memoryUsage().heapUsed;
  global.gc();
  const after = process.memoryUsage().heapUsed;
  const freed = (before - after) / 1024 / 1024;
}
```

---

## Summary

Node.js performance extends beyond V8 optimization:
- **GC**: Minimize allocations in hot paths
- **Async**: Batch operations, avoid unnecessary async
- **Buffers**: Reuse, pool, prefer TypedArrays for numbers
- **JSON**: Normalize shapes after parsing
- **Event loop**: Don't block, chunk CPU work
- **Logging**: Sample, use levels, lazy serialize
- **Streams**: Respect back-pressure

**Profile first, optimize second.** These patterns matter most when evidence shows they're bottlenecks.

## Further Reading

- Run `16-gc-allocation-pressure` and `17-async-await-microtasks` experiments
- Read Node.js docs on [Performance](https://nodejs.org/en/docs/guides/simple-profiling/)
- Explore [clinic.js](https://clinicjs.org/) for deep Node profiling
