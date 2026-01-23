/**
 * Fixed: Normalize to consistent shape
 *
 * Even when receiving objects with different shapes,
 * normalize them to a consistent shape before hot path.
 */

const WARMUP = parseInt(process.env.WARMUP || '1000', 10);
const REPEAT = parseInt(process.env.REPEAT || '100000', 10);

// Still create points with varying shapes (simulating real-world input)
function createRawPoint(x, y, variant) {
  switch (variant % 4) {
    case 0: return { x, y };
    case 1: return { y, x };
    case 2: return { x, y, z: 0 };
    case 3: return { y, x, z: 0 };
  }
}

// MITIGATION: Normalize to consistent shape
function normalizePoint(raw) {
  return {
    x: raw.x,
    y: raw.y
  };
  // Always same properties, same order
}

// Same hot function as baseline
function getDistance(point) {
  return Math.sqrt(point.x * point.x + point.y * point.y);
}

function benchmark() {
  console.log('Variant: fixed');
  console.log(`Warmup: ${WARMUP.toLocaleString()} iterations`);
  console.log(`Measurement: ${REPEAT.toLocaleString()} iterations`);

  // Create test data with varying shapes
  const rawPoints = [];
  for (let i = 0; i < 10; i++) {
    rawPoints.push(createRawPoint(i, i + 1, i));
  }

  // Normalize (happens once, outside hot path)
  const points = rawPoints.map(normalizePoint);
  // Now all points have same shape!

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
