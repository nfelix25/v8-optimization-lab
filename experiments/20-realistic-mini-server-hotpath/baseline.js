/**
 * Baseline: Optimizable version
 *
 * This variant should demonstrate the "good" case that V8 can optimize.
 */

// Get configuration from environment (set by run-experiment.js)
const WARMUP = parseInt(process.env.WARMUP || '1000', 10);
const REPEAT = parseInt(process.env.REPEAT || '100000', 10);

// ============================================================================
// The hot function (what we're measuring)
// ============================================================================

function hotFunction(/* params */) {
  // TODO: Implement optimizable version
  // - Consistent types
  // - Stable object shapes
  // - Monomorphic call sites
  return 0;
}

// ============================================================================
// Benchmark harness
// ============================================================================

function benchmark() {
  console.log('Variant: baseline');
  console.log(`Warmup: ${WARMUP.toLocaleString()} iterations`);
  console.log(`Measurement: ${REPEAT.toLocaleString()} iterations`);

  // Warmup phase
  for (let i = 0; i < WARMUP; i++) {
    hotFunction(/* args */);
  }

  // Measurement phase
  let sum = 0;  // Prevent dead code elimination
  const start = process.hrtime.bigint();

  for (let i = 0; i < REPEAT; i++) {
    sum += hotFunction(/* args */);
  }

  const end = process.hrtime.bigint();
  const durationMs = Number(end - start) / 1e6;
  const avgNs = (Number(end - start) / REPEAT);

  console.log(`Time: ${durationMs.toFixed(3)}ms`);
  console.log(`Avg per iteration: ${avgNs.toFixed(2)}ns`);
  console.log(`Sanity check: ${sum}`);  // Ensure work wasn't eliminated
}

benchmark();
