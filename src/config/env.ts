import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001').transform(Number),
  // Render and most managed providers hand out postgres:// rather than
  // postgresql://; both are valid and libpq treats them identically.
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, 'must be a postgres connection string'),
  JWT_SECRET: z.string().min(32),
  ANTHROPIC_API_KEY: z.string(),
  /**
   * Comma-separated list of browser origins allowed to call this API.
   *
   * Required in production: the frontend is deployed separately (Vercel) from
   * this API (Render), so requests are cross-origin and `cors()` with no
   * configuration would reflect any origin that asks.
   * Empty in development, where the Vite proxy makes requests same-origin.
   */
  CORS_ORIGIN: z.string().optional(),
});

const envResult = envSchema.safeParse(process.env);

if (!envResult.success) {
  console.error('Invalid environment variables:', envResult.error.flatten());
  process.exit(1);
}

export const env = envResult.data;

export const isProduction = env.NODE_ENV === 'production';

/** Parsed allowlist of browser origins. Empty means same-origin only. */
export const corsOrigins: string[] = (env.CORS_ORIGIN ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (isProduction && corsOrigins.length === 0) {
  console.warn(
    '[env] CORS_ORIGIN is not set in production. Cross-origin browser requests will be refused.',
  );
}

export type Env = typeof env;