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
        "Add DATABASE_URL=postgresql://al_lio_app:<password>@al_lio_postgres:5432/al_lio to your environment"
    );
  }
  if (!_pool) {
    _pool = new Pool({
      connectionString,
      application_name: "al-lio-web",
      max: integerEnv("PG_POOL_MAX", 10, 1, 50),
      idleTimeoutMillis: integerEnv("PG_IDLE_TIMEOUT_MS", 30_000, 1_000, 300_000),
      connectionTimeoutMillis: integerEnv("PG_CONNECTION_TIMEOUT_MS", 5_000, 500, 60_000),
      statement_timeout: integerEnv("PG_STATEMENT_TIMEOUT_MS", 15_000, 1_000, 120_000),
    });
    _pool.on("error", () => {
      console.error("PostgreSQL pool emitted an unexpected idle-client error");
    });
  }
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

export async function checkDatabaseConnection(): Promise<void> {
  await getPool().query("SELECT 1");
}

function integerEnv(name: string, fallback: number, minimum: number, maximum: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const normalized = raw.trim();
  const value = /^\d+$/.test(normalized) ? Number(normalized) : Number.NaN;
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return value;
}
