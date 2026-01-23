export interface DocMetadata {
  slug: string;
  title: string;
  path: string;
  description?: string;
}

export interface ExperimentMetadata {
  id: string;
  slug: string;
  name: string;
  description: string;
  variants: string[];
  tags: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  readmePath: string;
}

export type RunStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface RunOptions {
  exp: string;
  variant: 'baseline' | 'deopt' | 'fixed';
  trace: boolean;
  profile: boolean;
  warmup: number;
  repeat: number;
}

export interface RunMetadata {
  id: string;
  experiment: string;
  variant: string;
  options: {
    trace: boolean;
    profile: boolean;
    warmup: number;
    repeat: number;
  };
  status: RunStatus;
  timestamps: {
    queued: string;
    started?: string;
    completed?: string;
  };
  environment: {
    nodeVersion: string;
    v8Version: string;
    platform: string;
    arch: string;
    gitSha?: string;
  };
  results?: {
    exitCode: number;
    durationMs: number;
  };
  artifacts: {
    stdout?: string;
    stderr?: string;
    cpuProfile?: string;
  };
}
