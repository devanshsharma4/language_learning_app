/**
 * Minimal forward-only migration runner.
 *
 * Applies every unapplied .sql file in database/migrations in filename order,
 * each inside its own transaction, and records it in schema_migrations.
 *
 * This exists because the project previously applied database/schema.sql by hand.
 * Because that file uses CREATE TABLE IF NOT EXISTS, re-running it against a
 * database that already had an older version of a table was a silent no-op --
 * which is how the live lesson_responses table ended up with a question_answers
 * column while the code expected mcq_answers. Migrations make that class of drift
 * impossible: every schema change is a numbered file, applied exactly once, and
 * the database records which ones it has seen.
 *
 *   npm run migrate       (compiled, used on the server)
 *   npm run migrate:dev   (ts-node, used locally)
 */
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { pool } from '../config/database';

const MIGRATIONS_DIR = join(__dirname, '../../database/migrations');

async function main(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const applied = new Set(
      (
        await client.query<{ filename: string }>('SELECT filename FROM schema_migrations')
      ).rows.map((r) => r.filename),
    );

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No migration files found in', MIGRATIONS_DIR);
      return;
    }

    const pending = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      console.log(`Database is up to date (${files.length} migration(s) already applied).`);
      return;
    }

    for (const filename of pending) {
      const sql = readFileSync(join(MIGRATIONS_DIR, filename), 'utf8');
      process.stdout.write(`Applying ${filename} ... `);

      // Each migration is atomic: a failure leaves the database untouched and
      // unrecorded, so re-running after a fix retries the same file.
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
        await client.query('COMMIT');
        console.log('ok');
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {
          // A failed rollback must not replace the error that caused it.
        });
        console.log('FAILED');
        throw error;
      }
    }

    console.log(`Applied ${pending.length} migration(s).`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('\nMigration failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
