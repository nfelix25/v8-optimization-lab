import { randomUUID } from 'crypto';
import { mkdir, writeFile, readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { execa } from 'execa';
import { CONFIG } from '../config.js';
import { RunMetadata, RunOptions, RunStatus } from '../types.js';
import { EventEmitter } from 'events';

interface QueuedRun {
  id: string;
  options: RunOptions;
  metadata: RunMetadata;
}

export class RunService extends EventEmitter {
  private queue: QueuedRun[] = [];
  private currentRun: QueuedRun | null = null;
  private processing = false;

  async createRun(options: RunOptions): Promise<string> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const metadata: RunMetadata = {
      id,
      experiment: options.exp,
      variant: options.variant,
      options: {
        trace: options.trace,
        profile: options.profile,
        warmup: options.warmup,
        repeat: options.repeat,
      },
      status: 'queued',
      timestamps: {
        queued: now,
      },
      environment: {
        nodeVersion: process.version,
        v8Version: process.versions.v8,
        platform: process.platform,
        arch: process.arch,
      },
      artifacts: {},
    };

    const queuedRun: QueuedRun = { id, options, metadata };
    this.queue.push(queuedRun);

    // Save initial metadata
    await this.saveMetadata(metadata);

    // Start processing if not already
    if (!this.processing) {
      this.processQueue();
    }

    return id;
  }

  async listRuns(): Promise<RunMetadata[]> {
    const runsDir = join(CONFIG.artifactsDir, 'runs');

    try {
      await mkdir(runsDir, { recursive: true });
      const files = await readdir(runsDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      const runs: RunMetadata[] = [];
      for (const file of jsonFiles) {
        try {
          const content = await readFile(join(runsDir, file), 'utf-8');
          runs.push(JSON.parse(content));
        } catch (error) {
          console.error(`Error reading run file ${file}:`, error);
        }
      }

      // Sort by timestamp (newest first)
      return runs.sort((a, b) =>
        new Date(b.timestamps.queued).getTime() - new Date(a.timestamps.queued).getTime()
      );
    } catch (error) {
      return [];
    }
  }

  async getRun(id: string): Promise<RunMetadata | null> {
    const filePath = join(CONFIG.artifactsDir, 'runs', `${id}.json`);

    try {
      const content = await readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  private async processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const run = this.queue.shift()!;
      this.currentRun = run;

      try {
        await this.executeRun(run);
      } catch (error) {
        console.error(`Error executing run ${run.id}:`, error);
        run.metadata.status = 'failed';
        run.metadata.timestamps.completed = new Date().toISOString();
        await this.saveMetadata(run.metadata);
      }

      this.currentRun = null;
    }

    this.processing = false;
  }

  private async executeRun(run: QueuedRun) {
    const { id, options, metadata } = run;

    // Update status to running
    metadata.status = 'running';
    metadata.timestamps.started = new Date().toISOString();
    await this.saveMetadata(metadata);

    // Emit event for live streaming
    this.emit('run:start', id);

    const startTime = Date.now();

    // Build arguments for run-experiment.js
    const args = [
      'scripts/run-experiment.js',
      '--exp', options.exp,
      '--variant', options.variant,
      '--warmup', options.warmup.toString(),
      '--repeat', options.repeat.toString(),
    ];

    if (options.trace) args.push('--trace', 'on');
    if (options.profile) args.push('--profile', 'on');

    try {
      // Execute the experiment
      const result = execa('node', args, {
        cwd: CONFIG.rootDir,
        timeout: CONFIG.maxRunTimeoutMs,
      });

      // Stream stdout
      result.stdout?.on('data', (data) => {
        const chunk = data.toString();
        this.emit('run:stdout', id, chunk);
      });

      // Stream stderr
      result.stderr?.on('data', (data) => {
        const chunk = data.toString();
        this.emit('run:stderr', id, chunk);
      });

      // Wait for completion
      await result;

      const endTime = Date.now();

      // Update metadata with success
      metadata.status = 'completed';
      metadata.timestamps.completed = new Date().toISOString();
      metadata.results = {
        exitCode: 0,
        durationMs: endTime - startTime,
      };

      // Find the artifacts directory created by run-experiment.js
      const artifactsPattern = join(
        CONFIG.artifactsDir,
        options.exp,
        options.variant
      );

      // The script creates a timestamped subdirectory
      // We'll store the relative path for the frontend to access
      metadata.artifacts = {
        stdout: `${options.exp}/${options.variant}/latest/stdout.log`,
        stderr: options.trace ? `${options.exp}/${options.variant}/latest/trace.log` : undefined,
        cpuProfile: options.profile ? `${options.exp}/${options.variant}/latest/*.cpuprofile` : undefined,
      };

    } catch (error: any) {
      const endTime = Date.now();

      metadata.status = 'failed';
      metadata.timestamps.completed = new Date().toISOString();
      metadata.results = {
        exitCode: error.exitCode || 1,
        durationMs: endTime - startTime,
      };

      this.emit('run:error', id, error.message || 'Unknown error');
    }

    // Save final metadata
    await this.saveMetadata(metadata);
    this.emit('run:complete', id, metadata);
  }

  private async saveMetadata(metadata: RunMetadata) {
    const runsDir = join(CONFIG.artifactsDir, 'runs');
    await mkdir(runsDir, { recursive: true });

    const filePath = join(runsDir, `${metadata.id}.json`);
    await writeFile(filePath, JSON.stringify(metadata, null, 2), 'utf-8');
  }

  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      currentRun: this.currentRun?.id || null,
      processing: this.processing,
    };
  }
}

// Singleton instance
export const runService = new RunService();
