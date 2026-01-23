import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from server directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../.env') });

export const CONFIG = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  artifactsDir: process.env.ARTIFACTS_DIR || join(__dirname, '../../artifacts'),
  experimentsDir: process.env.EXPERIMENTS_DIR || join(__dirname, '../../experiments'),
  docsDir: process.env.DOCS_DIR || join(__dirname, '../../docs'),
  maxRunTimeoutMs: parseInt(process.env.MAX_RUN_TIMEOUT_MS || '600000', 10),
  rootDir: join(__dirname, '../..'),
};
