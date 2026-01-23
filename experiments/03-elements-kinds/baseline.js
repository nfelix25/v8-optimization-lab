/**
 * Baseline: Homogeneous array (PACKED_SMI_ELEMENTS)
 */

const WARMUP = parseInt(process.env.WARMUP || '1000', 10);
const REPEAT = parseInt(process.env.REPEAT || '100000', 10);

function sum(arr) {
  let total = 0;
  for (let i = 0; i < arr.length; i++) {
    total += arr[i];
  }
  return total;
}

function benchmark() {
  console.log('Variant: baseline');
  console.log(`Warmup: ${WARMUP.toLocaleString()} iterations`);
  console.log(`Measurement: ${REPEAT.toLocaleString()} iterations`);

  // PACKED_SMI_ELEMENTS - fastest
  const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  // Warmup
  for (let i = 0; i < WARMUP; i++) {
    sum(arr);
  }

  // Measurement
  let total = 0;
  const start = process.hrtime.bigint();

  for (let i = 0; i < REPEAT; i++) {
    total += sum(arr);
  }

  const end = process.hrtime.bigint();
  const durationMs = Number(end - start) / 1e6;
  const avgNs = (Number(end - start) / REPEAT);

  console.log(`Time: ${durationMs.toFixed(3)}ms`);
  console.log(`Avg per iteration: ${avgNs.toFixed(2)}ns`);
  console.log(`Sanity check: ${total}`);
}

benchmark();
