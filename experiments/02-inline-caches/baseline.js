/**
 * Baseline: Monomorphic call site
 */

const WARMUP = parseInt(process.env.WARMUP || '1000', 10);
const REPEAT = parseInt(process.env.REPEAT || '100000', 10);

function getValue(obj) {
  return obj.value;  // This property access - monomorphic
}

function benchmark() {
  console.log('Variant: baseline');
  console.log(`Warmup: ${WARMUP.toLocaleString()} iterations`);
  console.log(`Measurement: ${REPEAT.toLocaleString()} iterations`);

  // All objects same shape
  const objects = Array.from({ length: 10 }, (_, i) => ({ value: i }));

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
