const WARMUP = parseInt(process.env.WARMUP || '1000', 10);
const REPEAT = parseInt(process.env.REPEAT || '100000', 10);

function process(obj) {
  return obj.x + obj.y;
}

function benchmark() {
  console.log('Variant: baseline');
  console.log(`Warmup: ${WARMUP.toLocaleString()} iterations`);
  console.log(`Measurement: ${REPEAT.toLocaleString()} iterations`);

  const objects = Array.from({ length: 100 }, (_, i) => ({
    x: i,
    y: i + 1,
    z: null  // Present but nullified
  }));

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
