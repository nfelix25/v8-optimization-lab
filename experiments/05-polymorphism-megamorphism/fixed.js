const WARMUP = parseInt(process.env.WARMUP || '1000', 10);
const REPEAT = parseInt(process.env.REPEAT || '100000', 10);

function process(obj) {
  return obj.id * 2;  // Monomorphic again
}

function normalize(raw) {
  return { id: raw.id };
}

function benchmark() {
  console.log('Variant: fixed (normalized)');
  console.log(`Warmup: ${WARMUP.toLocaleString()} iterations`);
  console.log(`Measurement: ${REPEAT.toLocaleString()} iterations`);

  const raw = [
    { id: 0 },
    { id: 1, a: 1 },
    { id: 2, b: 2 },
    { id: 3, c: 3 },
    { id: 4, d: 4 },
    { id: 5, e: 5 },
    { id: 6, f: 6 },
    { id: 7, g: 7 },
    { id: 8, h: 8 },
    { id: 9, i: 9 }
  ];

  // Normalize → all same shape
  const objects = raw.map(normalize);

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
