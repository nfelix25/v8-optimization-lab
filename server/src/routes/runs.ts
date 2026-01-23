import express from 'express';
import { runService } from '../services/RunService.js';
import { runOptionsSchema } from '../validation.js';

const router = express.Router();

// GET /api/runs - List all runs
router.get('/', async (req, res, next) => {
  try {
    const runs = await runService.listRuns();
    res.json(runs);
  } catch (error) {
    next(error);
  }
});

// GET /api/runs/queue - Get queue status
router.get('/queue', (req, res) => {
  const status = runService.getQueueStatus();
  res.json(status);
});

// GET /api/runs/:id - Get single run
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const run = await runService.getRun(id);

    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    res.json(run);
  } catch (error) {
    next(error);
  }
});

// POST /api/runs - Create new run
router.post('/', async (req, res, next) => {
  try {
    // Validate input
    const validation = runOptionsSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validation.error.errors,
      });
    }

    const options = validation.data;
    const runId = await runService.createRun(options);

    res.status(201).json({
      id: runId,
      status: 'queued',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/runs/:id/stream - Server-Sent Events stream
router.get('/:id/stream', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify run exists
    const run = await runService.getRun(id);
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    // Setup SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send initial status
    res.write(`data: ${JSON.stringify({ type: 'status', data: run.status })}\n\n`);

    // If already completed, send completion and close
    if (run.status === 'completed' || run.status === 'failed') {
      res.write(`data: ${JSON.stringify({ type: 'complete', data: run })}\n\n`);
      res.end();
      return;
    }

    // Listen for events
    const onStdout = (runId: string, chunk: string) => {
      if (runId === id) {
        res.write(`data: ${JSON.stringify({ type: 'stdout', data: chunk })}\n\n`);
      }
    };

    const onStderr = (runId: string, chunk: string) => {
      if (runId === id) {
        res.write(`data: ${JSON.stringify({ type: 'stderr', data: chunk })}\n\n`);
      }
    };

    const onComplete = (runId: string, metadata: any) => {
      if (runId === id) {
        res.write(`data: ${JSON.stringify({ type: 'complete', data: metadata })}\n\n`);
        res.end();
        cleanup();
      }
    };

    const onError = (runId: string, error: string) => {
      if (runId === id) {
        res.write(`data: ${JSON.stringify({ type: 'error', data: error })}\n\n`);
      }
    };

    const cleanup = () => {
      runService.off('run:stdout', onStdout);
      runService.off('run:stderr', onStderr);
      runService.off('run:complete', onComplete);
      runService.off('run:error', onError);
    };

    // Register listeners
    runService.on('run:stdout', onStdout);
    runService.on('run:stderr', onStderr);
    runService.on('run:complete', onComplete);
    runService.on('run:error', onError);

    // Cleanup on client disconnect
    req.on('close', cleanup);

  } catch (error) {
    next(error);
  }
});

export default router;
