const WARMUP = parseInt(process.env.WARMUP || '1000', 10);
const REPEAT = parseInt(process.env.REPEAT || '100000', 10);

function process(obj) {
  return obj.id * 2;  // Monomorphic property access
}

function benchmark() {
  console.log('Variant: baseline (monomorphic)');
  console.log(`Warmup: ${WARMUP.toLocaleString()} iterations`);
  console.log(`Measurement: ${REPEAT.toLocaleString()} iterations`);

  // Only 1 shape
  const objects = Array.from({ length: 10 }, (_, i) => ({ id: i }));

  for (let i = 0; i < WARMUP; i++) {
    process(objects[i % objects.length]);
  }

  let sum = 0;
  const start = process.hrtime.bigint();

  for (let i = 0; i < REPEAT; i++) {
    sum += process(objects[i % objects.length]);
  }

  const end = process.hrtime.bigint();
  const durationMs = Number(end - start) / 1e6;

  console.log(`Time: ${durationMs.toFixed(3)}ms`);
  console.log(`Avg per iteration: ${(Number(end - start) / REPEAT).toFixed(2)}ns`);
  console.log(`Sanity check: ${sum}`);
}

benchmark();
