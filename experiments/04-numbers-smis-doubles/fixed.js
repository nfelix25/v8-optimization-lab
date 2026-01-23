const WARMUP = parseInt(process.env.WARMUP || '1000', 10);
const REPEAT = parseInt(process.env.REPEAT || '100000', 10);

function add(a, b) {
  // Convert to int32 if possible (keeps in Smi range)
  return (a | 0) + (b | 0);
}

function benchmark() {
  console.log('Variant: fixed');
  console.log(`Warmup: ${WARMUP.toLocaleString()} iterations`);
  console.log(`Measurement: ${REPEAT.toLocaleString()} iterations`);

  // Even if inputs are floats, force to integers
  const a = 42.5;
  const b = 58.3;

  for (let i = 0; i < WARMUP; i++) {
    add(a, b);
  }

  let sum = 0;
  const start = process.hrtime.bigint();

  for (let i = 0; i < REPEAT; i++) {
    sum += add(a, b);
  }

  const end = process.hrtime.bigint();
  const durationMs = Number(end - start) / 1e6;

  console.log(`Time: ${durationMs.toFixed(3)}ms`);
  console.log(`Avg per iteration: ${(Number(end - start) / REPEAT).toFixed(2)}ns`);
  console.log(`Sanity check: ${sum}`);
}

benchmark();
