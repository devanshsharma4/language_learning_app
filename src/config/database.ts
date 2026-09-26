import { Pool } from 'pg';
import { env, isProduction } from './env';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  // Managed Postgres (Render, Neon, Heroku) requires TLS and presents a cert
  // signed by its own internal CA, which Node does not trust by default.
  // rejectUnauthorized:false accepts it; the connection is still encrypted.
  ssl: isProduction ? { rejectUnauthorized: false } : undefined,
  // Free and hobby plans cap total connections well below 20, and exceeding the
  // cap fails the whole pool rather than queueing.
  max: isProduction ? 8 : 20,
  idleTimeoutMillis: 30000,
  // 2s is too tight for a managed instance waking from idle.
  connectionTimeoutMillis: 10000,
});

// Without a listener, an idle client erroring out (a routine occurrence when a
// managed database restarts) is an unhandled 'error' event, which crashes Node.
pool.on('error', (error) => {
  console.error('Unexpected error on idle database client:', error);
});

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows;
}

export async function getClient() {
  return await pool.connect();
}

export async function transaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    // A failed ROLLBACK (broken connection) must not replace the error that
    // caused it -- that one is the diagnosis, and it was previously lost.
    await client.query('ROLLBACK').catch((rollbackError) => {
      console.error('ROLLBACK failed while handling another error:', rollbackError);
    });
    throw error;
  } finally {
    client.release();
  }
}