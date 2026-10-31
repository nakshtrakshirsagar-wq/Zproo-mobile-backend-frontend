import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import config from './config';

export const pool = new Pool({ connectionString: config.databaseUrl, ssl: config.dbSsl ? true : undefined, max: 10 });
pool.on('error', (e) => console.error('Postgres pool error:', e.message));

export const query = <T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>> =>
  pool.query<T>(text, params);

/** Runs fn(client) inside one transaction; rolls back if fn throws. */
export async function tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const out = await fn(client);
    await client.query('commit');
    return out;
  } catch (e) {
    try { await client.query('rollback'); } catch { /* ignore */ }
    throw e;
  } finally {
    client.release();
  }
}
