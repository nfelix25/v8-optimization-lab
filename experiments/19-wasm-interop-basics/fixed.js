/**
 * Fixed: Mitigation/best practice version
 *
 * This variant demonstrates how to avoid the deopt while handling
 * the same scenarios as the deopt variant.
 */

// Get configuration from environment (set by run-experiment.js)
const WARMUP = parseInt(process.env.WARMUP || '1000', 10);
const REPEAT = parseInt(process.env.REPEAT || '100000', 10);

// ============================================================================
// The hot function (what we're measuring)
// ============================================================================

function hotFunction(/* params */) {
  // TODO: Implement fixed/optimizable version
  // Apply mitigation patterns:
  // - Normalize inputs
  // - Separate code paths for different types
  // - Maintain shape stability
  // - Avoid bailout conditions
  return 0;
}

// ============================================================================
// Benchmark harness
// ============================================================================

function benchmark() {
  console.log('Variant: fixed');
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
  console.log(`Sanity check: ${sum}`);
}

benchmark();
