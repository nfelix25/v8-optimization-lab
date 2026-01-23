/**
 * Fixed: Keep call sites monomorphic by normalizing
 */

const WARMUP = parseInt(process.env.WARMUP || '1000', 10);
const REPEAT = parseInt(process.env.REPEAT || '100000', 10);

function getValue(obj) {
  return obj.value;  // Monomorphic again
}

// Normalize to consistent shape
function normalize(raw) {
  return { value: raw.value };
}

function benchmark() {
  console.log('Variant: fixed');
  console.log(`Warmup: ${WARMUP.toLocaleString()} iterations`);
  console.log(`Measurement: ${REPEAT.toLocaleString()} iterations`);

  // Same varying input as deopt
  const rawObjects = [
    { value: 0 },
    { value: 1, a: 1 },
    { value: 2, b: 2 },
    { value: 3, c: 3 },
    { value: 4, d: 4 },
    { value: 5, e: 5 },
    { value: 6, f: 6 },
    { value: 7, g: 7 },
    { value: 8, h: 8 },
    { value: 9, i: 9 }
  ];

  // Normalize once (cold path)
  const objects = rawObjects.map(normalize);
  // Now all same shape!

  // Warmup
  for (let i = 0; i < WARMUP; i++) {
    getValue(objects[i % objects.length]);
  }

  // Measurement
  let sum = 0;
  const start = process.hrtime.bigint();

  for (let i = 0; i < REPEAT; i++) {
    sum += getValue(objects[i % objects.length]);
  }

  const end = process.hrtime.bigint();
  const durationMs = Number(end - start) / 1e6;
  const avgNs = (Number(end - start) / REPEAT);

  console.log(`Time: ${durationMs.toFixed(3)}ms`);
  console.log(`Avg per iteration: ${avgNs.toFixed(2)}ns`);
  console.log(`Sanity check: ${sum}`);
}

benchmark();
