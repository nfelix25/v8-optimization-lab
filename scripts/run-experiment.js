#!/usr/bin/env node

/**
 * Experiment Runner
 *
 * Runs experiment variants with configurable tracing and profiling.
 * Captures output and artifacts for later analysis.
 *
 * Usage:
 *   node scripts/run-experiment.js --exp 01-hidden-classes --variant baseline
 *   node scripts/run-experiment.js --exp 01-hidden-classes --variant deopt --trace on
 *   node scripts/run-experiment.js --exp 01-hidden-classes --variant fixed --profile on
 */

import { spawn } from 'child_process';
import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    exp: null,
    variant: null,
    trace: false,
    profile: false,
    warmup: 1000,
    repeat: 100000
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--exp':
        options.exp = next;
        i++;
        break;
      case '--variant':
        options.variant = next;
        i++;
        break;
      case '--trace':
        options.trace = next === 'on';
        i++;
        break;
      case '--profile':
        options.profile = next === 'on';
        i++;
        break;
      case '--warmup':
        options.warmup = parseInt(next, 10);
        i++;
        break;
      case '--repeat':
        options.repeat = parseInt(next, 10);
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

  // Validate required options
  if (!options.exp || !options.variant) {
    console.error('Error: --exp and --variant are required\n');
    printHelp();
    process.exit(1);
  }

  if (!['baseline', 'deopt', 'fixed'].includes(options.variant)) {
    console.error('Error: --variant must be baseline, deopt, or fixed\n');
    process.exit(1);
  }

  return options;
}

function printHelp() {
  console.log(`
Experiment Runner

Usage:
  npm run exp -- --exp <name> --variant <baseline|deopt|fixed> [options]

Required:
  --exp <name>          Experiment folder name (e.g., 01-hidden-classes)
  --variant <name>      Which variant to run (baseline, deopt, or fixed)

Options:
  --trace <on|off>      Enable V8 trace flags (default: off)
  --profile <on|off>    Capture CPU profile (default: off)
  --warmup <N>          Warmup iterations (default: 1000)
  --repeat <N>          Measurement iterations (default: 100000)
  --help                Show this help

Examples:
  npm run exp -- --exp 01-hidden-classes --variant baseline
  npm run exp -- --exp 01-hidden-classes --variant deopt --trace on
  npm run exp -- --exp 05-polymorphism-megamorphism --variant fixed --profile on
  npm run exp -- --exp 03-elements-kinds --variant baseline --warmup 5000 --repeat 50000
`);
}

// Build node flags based on options
function buildNodeFlags(options, artifactDir) {
  const flags = [];

  if (options.trace) {
    flags.push('--trace-opt');
    flags.push('--trace-deopt');
    // Note: --trace-ic may not be available in all Node versions
    // It's been removed in newer V8 versions, so we skip it
  }

  if (options.profile) {
    flags.push('--cpu-prof');
    flags.push(`--cpu-prof-dir=${artifactDir}`);
  }

  return flags;
}

// Run the experiment
async function runExperiment(options) {
  const experimentDir = join(ROOT, 'experiments', options.exp);
  const scriptPath = join(experimentDir, `${options.variant}.js`);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const artifactDir = join(ROOT, 'artifacts', options.exp, options.variant, timestamp);

  // Create artifact directory
  await mkdir(artifactDir, { recursive: true });

  console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║                        Running Experiment                                 ║
╚══════════════════════════════════════════════════════════════════════════╝

  Experiment: ${options.exp}
  Variant:    ${options.variant}
  Script:     ${scriptPath}
  Trace:      ${options.trace ? 'ON' : 'OFF'}
  Profile:    ${options.profile ? 'ON' : 'OFF'}
  Warmup:     ${options.warmup.toLocaleString()} iterations
  Repeat:     ${options.repeat.toLocaleString()} iterations
  Artifacts:  ${artifactDir}

Starting...
`);

  const startTime = process.hrtime.bigint();

  // Build command
  const nodeFlags = buildNodeFlags(options, artifactDir);
  const env = {
    ...process.env,
    WARMUP: options.warmup.toString(),
    REPEAT: options.repeat.toString()
  };

  // Spawn node process
  const nodeProcess = spawn('node', [...nodeFlags, scriptPath], {
    env,
    cwd: ROOT
  });

  let stdout = '';
  let stderr = '';

  nodeProcess.stdout.on('data', (data) => {
    const chunk = data.toString();
    stdout += chunk;
    process.stdout.write(chunk);
  });

  nodeProcess.stderr.on('data', (data) => {
    const chunk = data.toString();
    stderr += chunk;
    if (options.trace) {
      // Only print trace output if explicitly enabled
      process.stderr.write(chunk);
    } else {
      // Otherwise, just capture errors
      if (chunk.includes('Error') || chunk.includes('Warning')) {
        process.stderr.write(chunk);
      }
    }
  });

  // Wait for completion
  const exitCode = await new Promise((resolve) => {
    nodeProcess.on('close', resolve);
  });

  const endTime = process.hrtime.bigint();
  const durationMs = Number(endTime - startTime) / 1e6;

  // Save artifacts
  await saveArtifacts(artifactDir, {
    options,
    stdout,
    stderr,
    exitCode,
    durationMs,
    nodeVersion: process.version,
    v8Version: process.versions.v8,
    platform: process.platform,
    arch: process.arch,
    timestamp
  });

  // Print summary
  console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║                          Experiment Complete                              ║
╚══════════════════════════════════════════════════════════════════════════╝

  Exit code:      ${exitCode}
  Total duration: ${durationMs.toFixed(2)}ms
  Artifacts:      ${artifactDir}

${exitCode === 0 ? '✓ Success' : '✗ Failed'}
`);

  if (options.trace && stderr) {
    console.log(`\nTrace log saved to: ${join(artifactDir, 'trace.log')}`);
  }

  if (options.profile) {
    console.log(`CPU profile saved to: ${artifactDir}/`);
    console.log(`  → Open in Chrome DevTools (Performance tab → Load Profile)`);
  }

  console.log(`\nRun summarizer to analyze results:`);
  console.log(`  npm run summarize\n`);

  return exitCode;
}

// Save artifacts to disk
async function saveArtifacts(artifactDir, data) {
  const {
    options,
    stdout,
    stderr,
    exitCode,
    durationMs,
    nodeVersion,
    v8Version,
    platform,
    arch,
    timestamp
  } = data;

  // Save stdout
  if (stdout) {
    await writeFile(join(artifactDir, 'stdout.log'), stdout, 'utf8');
  }

  // Save stderr (trace output)
  if (stderr) {
    await writeFile(join(artifactDir, 'trace.log'), stderr, 'utf8');
  }

  // Save metadata JSON
  const metadata = {
    experiment: options.exp,
    variant: options.variant,
    options: {
      trace: options.trace,
      profile: options.profile,
      warmup: options.warmup,
      repeat: options.repeat
    },
    results: {
      exitCode,
      durationMs
    },
    environment: {
      nodeVersion,
      v8Version,
      platform,
      arch,
      timestamp
    }
  };

  await writeFile(
    join(artifactDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2),
    'utf8'
  );

  console.log(`\nArtifacts saved:`);
  console.log(`  - stdout.log`);
  if (stderr) console.log(`  - trace.log`);
  console.log(`  - metadata.json`);
}

// Main
(async () => {
  try {
    const options = parseArgs();
    const exitCode = await runExperiment(options);
    process.exit(exitCode);
  } catch (error) {
    console.error('\n❌ Error running experiment:');
    console.error(error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
})();
