import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { CONFIG } from './config.js';
import docsRouter from './routes/docs.js';
import experimentsRouter from './routes/experiments.js';
import runsRouter from './routes/runs.js';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    v8Version: process.versions.v8,
  });
});

// API routes
app.use('/api/docs', docsRouter);
app.use('/api/experiments', experimentsRouter);
app.use('/api/runs', runsRouter);

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(CONFIG.nodeEnv === 'development' && { stack: err.stack }),
  });
});

// Start server
app.listen(CONFIG.port, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║         V8 Optimization Lab - API Server                         ║
╚══════════════════════════════════════════════════════════════════╝

  🚀 Server running on http://localhost:${CONFIG.port}
  📚 Docs: http://localhost:${CONFIG.port}/api/docs
  🧪 Experiments: http://localhost:${CONFIG.port}/api/experiments
  ❤️  Health: http://localhost:${CONFIG.port}/health

  Environment: ${CONFIG.nodeEnv}
  Node: ${process.version}
  V8: ${process.versions.v8}
`);
});
