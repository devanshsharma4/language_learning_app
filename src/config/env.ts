import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001').transform(Number),
  DATABASE_URL: z.string().startsWith('postgresql://'),
  JWT_SECRET: z.string().min(32),
  ANTHROPIC_API_KEY: z.string(),
});

const envResult = envSchema.safeParse(process.env);

if (!envResult.success) {
  console.error('Invalid environment variables:', envResult.error.flatten());
  process.exit(1);
}

export const env = envResult.data;

export type Env = typeof env;