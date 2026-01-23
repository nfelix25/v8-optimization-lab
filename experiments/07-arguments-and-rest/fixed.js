const WARMUP = parseInt(process.env.WARMUP || '1000', 10);
const REPEAT = parseInt(process.env.REPEAT || '100000', 10);

function sum(...numbers) {  // Fixed: use rest parameters
  let total = 0;
  for (let i = 0; i < numbers.length; i++) {
    total += numbers[i];
  }
  return total;
}

function benchmark() {
  console.log('Variant: fixed (rest parameters)');
  console.log(`Warmup: ${WARMUP.toLocaleString()} iterations`);
  console.log(`Measurement: ${REPEAT.toLocaleString()} iterations`);

  for (let i = 0; i < WARMUP; i++) {
    sum(1, 2, 3, 4, 5);
  }

  let total = 0;
  const start = process.hrtime.bigint();

  for (let i = 0; i < REPEAT; i++) {
    total += sum(1, 2, 3, 4, 5);
  }

  const end = process.hrtime.bigint();
  const durationMs = Number(end - start) / 1e6;

  console.log(`Time: ${durationMs.toFixed(3)}ms`);
  console.log(`Avg per iteration: ${(Number(end - start) / REPEAT).toFixed(2)}ns`);
  console.log(`Sanity check: ${total}`);
}

benchmark();
