/**
 * Deopt: Inconsistent object shapes
 *
 * Point objects created with different property orders
 * → Different hidden classes
 * → Polymorphic/megamorphic property access
 * → Slow
 */

const WARMUP = parseInt(process.env.WARMUP || '1000', 10);
const REPEAT = parseInt(process.env.REPEAT || '100000', 10);

// Create points with VARYING property order (the problem!)
function createPoint(x, y, variant) {
  // Different property orders create different hidden classes
  switch (variant % 4) {
    case 0: return { x, y };
    case 1: return { y, x };  // Different order!
    case 2: return { x, y, z: 0 };  // Extra property
    case 3: return { y, x, z: 0 };  // Different order + extra
  }
}

// Same hot function as baseline
function getDistance(point) {
  return Math.sqrt(point.x * point.x + point.y * point.y);
}

function benchmark() {
  console.log('Variant: deopt');
  console.log(`Warmup: ${WARMUP.toLocaleString()} iterations`);
  console.log(`Measurement: ${REPEAT.toLocaleString()} iterations`);

  // Create test data - DIFFERENT shapes
  const points = [];
  for (let i = 0; i < 10; i++) {
    points.push(createPoint(i, i + 1, i));  // Different shape per point
  }

  // Warmup (V8 sees multiple shapes)
  for (let i = 0; i < WARMUP; i++) {
    getDistance(points[i % points.length]);
  }

  // Measurement
  let sum = 0;
  const start = process.hrtime.bigint();

  for (let i = 0; i < REPEAT; i++) {
    sum += getDistance(points[i % points.length]);
  }

  const end = process.hrtime.bigint();
  const durationMs = Number(end - start) / 1e6;
  const avgNs = (Number(end - start) / REPEAT);

  console.log(`Time: ${durationMs.toFixed(3)}ms`);
  console.log(`Avg per iteration: ${avgNs.toFixed(2)}ns`);
  console.log(`Sanity check: ${sum.toFixed(2)}`);
}

benchmark();
