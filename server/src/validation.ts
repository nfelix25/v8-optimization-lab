import { z } from 'zod';

export const runOptionsSchema = z.object({
  exp: z.string().min(1).max(100).regex(/^[\w-]+$/),
  variant: z.enum(['baseline', 'deopt', 'fixed']),
  trace: z.boolean().optional().default(false),
  profile: z.boolean().optional().default(false),
  warmup: z.number().int().min(0).max(100000).optional().default(1000),
  repeat: z.number().int().min(1).max(1000000).optional().default(100000),
});

export type ValidatedRunOptions = z.infer<typeof runOptionsSchema>;
