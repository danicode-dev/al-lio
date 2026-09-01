// Fail-closed configuration for the browser E2E harness (issue #329).
//
// resolveE2eConfig() is called from the Playwright config, the global setup,
// and every fixture that opens a database connection. If any target looks like
// production - a non-loopback host, a database whose name or user is not
// clearly the E2E one, the production origin, or NODE_ENV=production - it
// throws before a single connection or browser is opened.

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
const FORBIDDEN_SUBSTRINGS = ["al-lio.app"];
const REQUIRED_DB_MARKER = "e2e";
const RESERVED_PORTS = new Set([3000, 3200]);

export const DEFAULT_APP_PORT = 3210;
export const DEFAULT_DATABASE_URL = "postgresql://al_lio_e2e:al_lio_e2e@127.0.0.1:54339/al_lio_e2e";

export type E2eConfig = {
  databaseUrl: string;
  databaseName: string;
  databaseHost: string;
  baseURL: string;
  appPort: number;
};

function refuse(message: string): never {
  throw new Error(`[e2e-guard] ${message}`);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) refuse(message);
}

function isLoopback(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname.toLowerCase().replace(/^\[|\]$/g, ""));
}

let cached: E2eConfig | null = null;

export function resolveE2eConfig(): E2eConfig {
  if (cached) return cached;

  assert(process.env.NODE_ENV !== "production", "NODE_ENV must not be 'production' for the E2E harness.");

  const databaseUrl = process.env.E2E_DATABASE_URL || DEFAULT_DATABASE_URL;
  const appPort = Number(process.env.E2E_APP_PORT || DEFAULT_APP_PORT);
  const baseURL = process.env.E2E_BASE_URL || `http://127.0.0.1:${appPort}`;

  assert(Number.isInteger(appPort) && appPort > 0, "E2E_APP_PORT must be a positive integer.");

  for (const value of [databaseUrl, baseURL]) {
    for (const forbidden of FORBIDDEN_SUBSTRINGS) {
      assert(!value.includes(forbidden), `Refusing to run: "${forbidden}" appears in an E2E target. This harness never touches production.`);
    }
  }

  let db: URL;
  try {
    db = new URL(databaseUrl);
  } catch {
    return refuse("E2E_DATABASE_URL is not a valid URL.");
  }
  assert(db.protocol === "postgres:" || db.protocol === "postgresql:", "E2E_DATABASE_URL must be a postgres:// URL.");
  assert(isLoopback(db.hostname), `E2E_DATABASE_URL host "${db.hostname}" is not loopback. Only a local database is allowed.`);
  const databaseName = decodeURIComponent(db.pathname.replace(/^\//, ""));
  assert(databaseName.toLowerCase().includes(REQUIRED_DB_MARKER), `E2E_DATABASE_URL database "${databaseName}" must contain "${REQUIRED_DB_MARKER}".`);
  assert(decodeURIComponent(db.username).toLowerCase().includes(REQUIRED_DB_MARKER), `E2E_DATABASE_URL user must contain "${REQUIRED_DB_MARKER}".`);

  let app: URL;
  try {
    app = new URL(baseURL);
  } catch {
    return refuse("E2E_BASE_URL is not a valid URL.");
  }
  assert(app.protocol === "http:" || app.protocol === "https:", "E2E_BASE_URL must be an http(s) URL.");
  assert(isLoopback(app.hostname), `E2E_BASE_URL host "${app.hostname}" is not loopback. The E2E application must be local.`);
  const urlPort = Number(app.port || (app.protocol === "https:" ? 443 : 80));
  assert(urlPort === appPort, `E2E_BASE_URL port ${urlPort} does not match the configured E2E app port ${appPort}.`);
  assert(!RESERVED_PORTS.has(urlPort), `Port ${urlPort} is reserved for local development or the owner review server; the E2E app must use ${DEFAULT_APP_PORT}.`);

  cached = { databaseUrl, databaseName, databaseHost: db.host, baseURL, appPort };
  return cached;
}
