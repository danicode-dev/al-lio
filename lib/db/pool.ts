import "server-only";
import { Pool, type QueryResultRow } from "pg";

const connectionString = process.env.DATABASE_URL ?? null;

// Pool is lazily initialized so that importing this module at build time
// does not throw when DATABASE_URL is absent from the local dev environment.
let _pool: Pool | null = null;

function getPool(): Pool {
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. " +
        "Add DATABASE_URL=postgresql://aidraft:<password>@aidraft_postgres:5432/aidraft to your .env"
    );
  }
  if (!_pool) _pool = new Pool({ connectionString });
  return _pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
) {
  return getPool().query<T>(text, params);
}

export async function end() {
  if (_pool) await _pool.end();
}
