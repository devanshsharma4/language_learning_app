import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env, corsOrigins, isProduction } from './config/env';
import { query } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { globalLimiter } from './middleware/rateLimit';
import { authRouter } from './routes/auth';
import { lessonsRouter } from './routes/lessons';
import { vocabularyRouter } from './routes/vocabulary';
import { notesRouter } from './routes/notes';

const app = express();

// Render (and most PaaS) terminate TLS at a proxy. Without this, req.ip is the
// proxy's address, which would make every IP-keyed rate limit a single shared
// bucket for all users.
if (isProduction) {
  app.set('trust proxy', 1);
}

// This API serves JSON only -- the frontend is a separate static deployment --
// so the HTML-oriented defaults (CSP, COEP) have nothing to protect here.
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

app.use(
  cors({
    // An explicit allowlist. Bare cors() reflects whatever Origin is sent, which
    // is fine same-origin but not for a frontend deployed on another host.
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  }),
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

/**
 * Health check. Touches the database on purpose: reporting "ok" while the
 * connection pool is dead tells a platform health check exactly the wrong thing.
 */
app.get('/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res
      .status(503)
      .json({ status: 'degraded', database: 'unreachable', timestamp: new Date().toISOString() });
  }
});

app.use('/api', globalLimiter);

app.use('/api/auth', authRouter);
app.use('/api/lessons', lessonsRouter);
app.use('/api/vocabulary', vocabularyRouter);
app.use('/api/notes', notesRouter);

// Unmatched /api paths should be a JSON 404, not fall through to the error
// handler's generic 500.
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);

const PORT = env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
});
