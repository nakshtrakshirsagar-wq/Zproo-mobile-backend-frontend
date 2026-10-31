import fs from 'fs';
import path from 'path';
import { pool } from './db';

/** Applies every sql/*.sql file that has not been applied yet, in name order. */
async function main(): Promise<void> {
  const dir = path.join(__dirname, '..', 'sql'); // works from src/ (tsx) and dist/ (compiled)
  const c = await pool.connect();
  try {
    await c.query('create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())');
    const done = new Set((await c.query<{ name: string }>('select name from schema_migrations')).rows.map((r) => r.name));
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
      if (done.has(f)) { console.log('skip   ', f); continue; }
      await c.query('begin');
      try {
        await c.query(fs.readFileSync(path.join(dir, f), 'utf8'));
        await c.query('insert into schema_migrations (name) values ($1)', [f]);
        await c.query('commit');
        console.log('applied', f);
      } catch (e) { await c.query('rollback'); throw e; }
    }
    console.log('Database is up to date.');
  } finally {
    c.release();
    await pool.end();
  }
}

main().catch((e: Error) => {
  console.error('Migration failed:', e.message);
  process.exitCode = 1;
});
