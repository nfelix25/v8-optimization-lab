/**
 * Deopt: Megamorphic call site (5+ different shapes)
 */

const WARMUP = parseInt(process.env.WARMUP || '1000', 10);
const REPEAT = parseInt(process.env.REPEAT || '100000', 10);

function getValue(obj) {
  return obj.value;  // This will become MEGAMORPHIC
}

function benchmark() {
  console.log('Variant: deopt');
  console.log(`Warmup: ${WARMUP.toLocaleString()} iterations`);
  console.log(`Measurement: ${REPEAT.toLocaleString()} iterations`);

  // Create 10 objects with DIFFERENT shapes (megamorphic trigger)
  const objects = [
    { value: 0 },
    { value: 1, a: 1 },
    { value: 2, b: 2 },
    { value: 3, c: 3 },
    { value: 4, d: 4 },
    { value: 5, e: 5 },  // 6th shape = megamorphic
    { value: 6, f: 6 },
    { value: 7, g: 7 },
    { value: 8, h: 8 },
    { value: 9, i: 9 }
  ];

  // Warmup (IC becomes megamorphic)
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
