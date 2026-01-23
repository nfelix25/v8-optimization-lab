/**
 * Baseline: Consistent object shapes
 *
 * All Point objects created with same property order (x, y)
 * → Share same hidden class
 * → Monomorphic property access
 */

const WARMUP = parseInt(process.env.WARMUP || '1000', 10);
const REPEAT = parseInt(process.env.REPEAT || '100000', 10);

// Create points with consistent property order
function createPoint(x, y) {
  return { x, y };  // Always x first, then y
}

// Hot function: access properties
function getDistance(point) {
  return Math.sqrt(point.x * point.x + point.y * point.y);
}

function benchmark() {
  console.log('Variant: baseline');
  console.log(`Warmup: ${WARMUP.toLocaleString()} iterations`);
  console.log(`Measurement: ${REPEAT.toLocaleString()} iterations`);

  // Create test data - all same shape
  const points = [];
  for (let i = 0; i < 10; i++) {
    points.push(createPoint(i, i + 1));
  }

  // Warmup
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
