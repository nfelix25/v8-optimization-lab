/**
 * Deopt: Version that triggers deoptimization
 *
 * This variant should demonstrate what NOT to do - it intentionally
 * triggers the deoptimization pattern being studied.
 */

// Get configuration from environment (set by run-experiment.js)
const WARMUP = parseInt(process.env.WARMUP || '1000', 10);
const REPEAT = parseInt(process.env.REPEAT || '100000', 10);

// ============================================================================
// The hot function (what we're measuring)
// ============================================================================

function hotFunction(/* params */) {
  // TODO: Implement deopt-triggering version
  // - Type instability
  // - Shape changes
  // - Polymorphism/megamorphism
  // - Bailout conditions
  return 0;
}

// ============================================================================
// Benchmark harness
// ============================================================================

function benchmark() {
  console.log('Variant: deopt');
  console.log(`Warmup: ${WARMUP.toLocaleString()} iterations`);
  console.log(`Measurement: ${REPEAT.toLocaleString()} iterations`);

  // Warmup phase (may establish initial optimization)
  for (let i = 0; i < WARMUP; i++) {
    hotFunction(/* args */);
  }

  // Measurement phase (where deopt typically occurs)
  let sum = 0;  // Prevent dead code elimination
  const start = process.hrtime.bigint();

  for (let i = 0; i < REPEAT; i++) {
    // TODO: Add deopt trigger
    // E.g., pass different types, change object shapes, etc.
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
