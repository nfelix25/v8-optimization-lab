#!/usr/bin/env node

/**
 * Results Summarizer
 *
 * Analyzes artifacts from experiment runs and generates a readable report.
 *
 * Usage:
 *   node scripts/summarize-results.js [--exp <name>] [--latest N]
 */

import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const ARTIFACTS_DIR = join(ROOT, 'artifacts');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    exp: null,
    latest: 10
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--exp':
        options.exp = next;
        i++;
        break;
      case '--latest':
        options.latest = parseInt(next, 10);
        i++;
        break;
      case '--help':
        printHelp();
        process.exit(0);
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown option: ${arg}`);
          printHelp();
          process.exit(1);
        }
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Results Summarizer

Usage:
  npm run summarize [-- --exp <name>] [--latest N]

Options:
  --exp <name>      Only show results for this experiment (default: all)
  --latest <N>      Show N most recent results per variant (default: 10)
  --help            Show this help

Examples:
  npm run summarize
  npm run summarize -- --exp 01-hidden-classes
  npm run summarize -- --exp 05-polymorphism-megamorphism --latest 5
`);
}

// Find all result directories
async function findResults(expFilter = null) {
  const results = [];

  if (!existsSync(ARTIFACTS_DIR)) {
    return results;
  }

  const experiments = await readdir(ARTIFACTS_DIR);

  for (const exp of experiments) {
    if (expFilter && exp !== expFilter) continue;

    const expDir = join(ARTIFACTS_DIR, exp);
    const variants = await readdir(expDir);

    for (const variant of variants) {
      const variantDir = join(expDir, variant);
      const runs = await readdir(variantDir);

      for (const run of runs) {
        const runDir = join(variantDir, run);
        const metadataPath = join(runDir, 'metadata.json');

        if (existsSync(metadataPath)) {
          const metadata = JSON.parse(
            await readFile(metadataPath, 'utf8')
          );

          results.push({
            exp,
            variant,
            timestamp: run,
            path: runDir,
            metadata
          });
        }
      }
    }
  }

  // Sort by timestamp descending (newest first)
  results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return results;
}

// Parse trace log for optimization info
async function parseTraceLog(tracePath) {
  if (!existsSync(tracePath)) {
    return {
      optimizations: [],
      deopts: [],
      megamorphic: []
    };
  }

  const trace = await readFile(tracePath, 'utf8');
  const lines = trace.split('\n');

  const optimizations = [];
  const deopts = [];
  const megamorphic = [];

  for (const line of lines) {
    // Match optimization
    if (line.includes('[marking') && line.includes('for optimization')) {
      const match = line.match(/<JSFunction ([^>]+)>/);
      if (match) {
        optimizations.push(match[1]);
      }
    }

    // Match deoptimization
    if (line.includes('[deoptimizing')) {
      const match = line.match(/<JSFunction ([^>]+)>/);
      const reasonMatch = line.match(/Reason: ([^\]]+)/);
      if (match) {
        deopts.push({
          fn: match[1],
          reason: reasonMatch ? reasonMatch[1] : 'Unknown'
        });
      }
    }

    // Match megamorphic transitions
    if (line.includes('MEGAMORPHIC')) {
      const match = line.match(/in ~([^\s+]+)/);
      if (match) {
        megamorphic.push(match[1]);
      }
    }
  }

  return {
    optimizations: [...new Set(optimizations)],
    deopts,
    megamorphic: [...new Set(megamorphic)]
  };
}

// Extract timing from stdout
function extractTiming(stdout) {
  const match = stdout.match(/Time:\s*([\d.]+)ms/);
  if (match) {
    return parseFloat(match[1]);
  }

  const avgMatch = stdout.match(/Avg per iteration:\s*([\d.]+)(ns|μs|ms)/);
  if (avgMatch) {
    const value = parseFloat(avgMatch[1]);
    const unit = avgMatch[2];
    // Convert to ms
    if (unit === 'ns') return value / 1e6;
    if (unit === 'μs') return value / 1e3;
    return value;
  }

  return null;
}

// Generate summary report
async function generateReport(results, options) {
  if (results.length === 0) {
    console.log('\n📭 No results found.\n');
    console.log('Run an experiment first:');
    console.log('  npm run exp -- --exp 01-hidden-classes --variant baseline\n');
    return;
  }

  // Group by experiment
  const byExperiment = {};
  for (const result of results) {
    if (!byExperiment[result.exp]) {
      byExperiment[result.exp] = {};
    }
    if (!byExperiment[result.exp][result.variant]) {
      byExperiment[result.exp][result.variant] = [];
    }
    byExperiment[result.exp][result.variant].push(result);
  }

  console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║                         Experiment Results Summary                        ║
╚══════════════════════════════════════════════════════════════════════════╝
`);

  for (const [exp, variants] of Object.entries(byExperiment)) {
    console.log(`\n${'='.repeat(78)}`);
    console.log(`Experiment: ${exp}`);
    console.log('='.repeat(78));

    for (const [variant, runs] of Object.entries(variants)) {
      console.log(`\n  Variant: ${variant}`);
      console.log(`  ${'─'.repeat(70)}`);

      const recent = runs.slice(0, options.latest);

      for (const run of recent) {
        const { metadata, path } = run;

        // Read stdout for timing
        const stdoutPath = join(path, 'stdout.log');
        const tracePath = join(path, 'trace.log');

        let stdout = '';
        if (existsSync(stdoutPath)) {
          stdout = await readFile(stdoutPath, 'utf8');
        }

        const timing = extractTiming(stdout);
        const traceInfo = await parseTraceLog(tracePath);

        console.log(`\n  ┌ Run: ${run.timestamp}`);
        console.log(`  │ Node: ${metadata.environment.nodeVersion} (V8 ${metadata.environment.v8Version})`);
        console.log(`  │ Platform: ${metadata.environment.platform}/${metadata.environment.arch}`);

        if (timing !== null) {
          console.log(`  │ Time: ${timing.toFixed(3)}ms`);
        }

        if (metadata.options.trace) {
          console.log(`  │`);
          console.log(`  │ Optimizations: ${traceInfo.optimizations.length}`);
          if (traceInfo.optimizations.length > 0 && traceInfo.optimizations.length <= 5) {
            traceInfo.optimizations.forEach(fn => {
              console.log(`  │   ✓ ${fn}`);
            });
          }

          console.log(`  │ Deopts: ${traceInfo.deopts.length}`);
          if (traceInfo.deopts.length > 0 && traceInfo.deopts.length <= 5) {
            traceInfo.deopts.forEach(({ fn, reason }) => {
              console.log(`  │   ✗ ${fn} - ${reason}`);
            });
          } else if (traceInfo.deopts.length > 5) {
            console.log(`  │   ✗ ${traceInfo.deopts.length} deopts detected (see trace log)`);
          }

          console.log(`  │ Megamorphic sites: ${traceInfo.megamorphic.length}`);
          if (traceInfo.megamorphic.length > 0 && traceInfo.megamorphic.length <= 5) {
            traceInfo.megamorphic.forEach(site => {
              console.log(`  │   ⚠ ${site}`);
            });
          } else if (traceInfo.megamorphic.length > 5) {
            console.log(`  │   ⚠ ${traceInfo.megamorphic.length} megamorphic sites (see trace log)`);
          }
        }

        console.log(`  │ Artifacts: ${path}`);
        console.log(`  └${'─'.repeat(68)}`);
      }

      if (runs.length > options.latest) {
        console.log(`\n  (${runs.length - options.latest} older runs not shown. Use --latest N to see more.)`);
      }
    }

    // Compare variants if we have timing data
    console.log(`\n  Performance Comparison:`);
    console.log(`  ${'─'.repeat(70)}`);

    const variantTimings = {};
    for (const [variant, runs] of Object.entries(variants)) {
      const recentRun = runs[0];
      const stdoutPath = join(recentRun.path, 'stdout.log');

      if (existsSync(stdoutPath)) {
        const stdout = await readFile(stdoutPath, 'utf8');
        const timing = extractTiming(stdout);
        if (timing !== null) {
          variantTimings[variant] = timing;
        }
      }
    }

    if (Object.keys(variantTimings).length > 0) {
      const baseline = variantTimings.baseline;

      for (const [variant, timing] of Object.entries(variantTimings)) {
        const delta = baseline ? ((timing - baseline) / baseline * 100).toFixed(1) : 0;
        const indicator = baseline && timing > baseline ? '📉' :
                         baseline && timing < baseline ? '📈' :
                         '➖';

        console.log(`  ${indicator} ${variant.padEnd(12)} ${timing.toFixed(3)}ms`.padEnd(35) +
                    (baseline && variant !== 'baseline' ? `(${delta > 0 ? '+' : ''}${delta}%)` : ''));
      }
    } else {
      console.log(`  (No timing data available)`);
    }
  }

  console.log(`\n${'='.repeat(78)}\n`);
  console.log(`📊 Total runs: ${results.length}`);
  console.log(`📁 Artifacts directory: ${ARTIFACTS_DIR}\n`);
}

// Main
(async () => {
  try {
    const options = parseArgs();
    const results = await findResults(options.exp);
    await generateReport(results, options);
  } catch (error) {
    console.error('\n❌ Error generating summary:');
    console.error(error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
})();
