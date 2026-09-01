/**
 * Environment isolation for the browser E2E application (issue #329).
 *
 * The E2E application is a `next dev` process. Next 15 loads `.env`,
 * `.env.local`, `.env.development` and `.env.development.local` from the
 * project directory, and a naively spawned child also inherits the parent
 * shell. Either path could hand the E2E server a developer or production
 * `DATABASE_URL`, `SESSION_SECRET`, Google / Resend / OAuth / Radar / Supabase
 * / import credential.
 *
 * `buildE2eAppEnv()` rebuilds the child environment from scratch:
 *
 *   1. only an explicit operating-system passthrough list is copied from the
 *      parent (PATH and the handful of Windows / POSIX bootstrap variables a
 *      Node process needs to start) - never the parent env wholesale;
 *   2. only the approved application variables the tested routes need are set,
 *      to the synthetic per-run values passed in by the runner;
 *   3. every key found in a project `.env*` file that is not approved is pinned
 *      to an empty string, so `@next/env` treats it as "already defined" and
 *      refuses to load the real value (documented precedence rule);
 *   4. `__NEXT_PROCESSED_ENV=true` disables `@next/env` dotenv processing
 *      entirely as a second layer.
 *
 * `assertNoIntegrationSecrets()` then fails closed if any known integration
 * secret still carries a value.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
const FORBIDDEN_SUBSTRINGS = ["al-lio.app"];
const REQUIRED_DB_MARKER = "e2e";
const RESERVED_PORTS = new Set([3000, 3200]);

// The only application variables the E2E server is allowed to receive. The
// login -> dashboard -> Tasks journey needs exactly these; nothing else.
export const APPROVED_APP_ENV_KEYS = Object.freeze([
  "NODE_ENV",
  "PORT",
  "HOSTNAME",
  "DATABASE_URL",
  "SESSION_SECRET",
  "BASE_URL",
  "AL_LIO_DEMO_ACCESS_ENABLED",
  "NEXT_TELEMETRY_DISABLED",
  "__NEXT_PROCESSED_ENV",
]);

// Non-secret bootstrap variables a Node / Next process needs to start. Copied
// through only when present in the parent. None of these carry credentials.
export const OS_PASSTHROUGH_KEYS = Object.freeze([
  "PATH",
  "Path",
  "PATHEXT",
  "SystemRoot",
  "SystemDrive",
  "windir",
  "COMSPEC",
  "TEMP",
  "TMP",
  "TZ",
  "LANG",
  "LC_ALL",
  "HOME",
  "HOMEDRIVE",
  "HOMEPATH",
  "USERPROFILE",
  "USERNAME",
  "USERDOMAIN",
  "PUBLIC",
  "ProgramData",
  "ProgramFiles",
  "ProgramFiles(x86)",
  "ProgramW6432",
  "CommonProgramFiles",
  "CommonProgramFiles(x86)",
  "APPDATA",
  "LOCALAPPDATA",
  "NUMBER_OF_PROCESSORS",
  "PROCESSOR_ARCHITECTURE",
  "PROCESSOR_IDENTIFIER",
]);

// Substrings that must never appear as a key (with a non-empty value) in the
// E2E application environment. Matched case-insensitively.
const INTEGRATION_SECRET_MARKERS = Object.freeze([
  "GOOGLE",
  "RESEND",
  "RADAR",
  "SUPABASE",
  "INFOJOBS",
  "ADZUNA",
  "JOOBLE",
  "NEXTAUTH",
  "OAUTH",
  "SMTP",
  "SENDGRID",
  "MAILGUN",
  "OPENAI",
  "ANTHROPIC",
  "AWS_",
  "STRIPE",
  "SEED",
  "MIGRATION_URL",
  "ENCRYPTION_KEY",
  "WEBHOOK",
  "TARGET_USER_EMAIL",
  "PUBLIC_ASSET_BASE_URL",
  "DEMO_PASSWORD",
  "API_KEY",
  "CLIENT_SECRET",
  "CLIENT_ID",
  "ACCESS_TOKEN",
  "REFRESH_TOKEN",
  "PRIVATE_KEY",
]);

// `.env*` files Next would load for `next dev` (NODE_ENV=development).
const DOTENV_FILES = Object.freeze([
  ".env.development.local",
  ".env.local",
  ".env.development",
  ".env",
]);

function refuse(message) {
  throw new Error(`[e2e-app-guard] ${message}`);
}

function isLoopback(hostname) {
  return LOOPBACK_HOSTS.has(hostname.toLowerCase().replace(/^\[|\]$/g, ""));
}

function assertIsolatedDatabaseUrl(value) {
  for (const forbidden of FORBIDDEN_SUBSTRINGS) {
    if (value.includes(forbidden)) refuse(`"${forbidden}" appears in DATABASE_URL. The E2E app never points at production.`);
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    refuse("DATABASE_URL is not a valid URL.");
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") refuse("DATABASE_URL must be a postgres:// URL.");
  if (!isLoopback(url.hostname)) refuse(`DATABASE_URL host "${url.hostname}" is not loopback.`);
  const name = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!name.toLowerCase().includes(REQUIRED_DB_MARKER)) refuse(`DATABASE_URL database "${name}" must contain "${REQUIRED_DB_MARKER}".`);
  if (!decodeURIComponent(url.username).toLowerCase().includes(REQUIRED_DB_MARKER)) {
    refuse(`DATABASE_URL user must contain "${REQUIRED_DB_MARKER}".`);
  }
}

function assertIsolatedBaseUrl(value) {
  for (const forbidden of FORBIDDEN_SUBSTRINGS) {
    if (value.includes(forbidden)) refuse(`"${forbidden}" appears in BASE_URL.`);
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    refuse("BASE_URL is not a valid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") refuse("BASE_URL must be an http(s) URL.");
  if (!isLoopback(url.hostname)) refuse(`BASE_URL host "${url.hostname}" is not loopback.`);
  const port = Number(url.port || (url.protocol === "https:" ? 443 : 80));
  if (RESERVED_PORTS.has(port)) refuse(`BASE_URL port ${port} is reserved for local dev / the owner review server.`);
}

/**
 * Parse a minimal `KEY=value` dotenv file into a plain object. Values are not
 * expanded; only the key names matter here.
 */
export function parseDotEnvKeys(contents) {
  const keys = new Set();
  for (const raw of String(contents).split(/\r?\n/)) {
    const line = raw.trim().replace(/^﻿/, "");
    if (!line || line.startsWith("#")) continue;
    const withoutExport = line.startsWith("export ") ? line.slice(7).trim() : line;
    const separator = withoutExport.indexOf("=");
    if (separator < 1) continue;
    const key = withoutExport.slice(0, separator).trim();
    if (/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(key)) keys.add(key);
  }
  return keys;
}

/**
 * Collect every variable name declared by any `.env*` file Next would load
 * from `projectRoot`.
 */
export function dotEnvDeclaredKeys(projectRoot, files = DOTENV_FILES) {
  const declared = new Set();
  for (const file of files) {
    const path = join(projectRoot, file);
    if (!existsSync(path)) continue;
    for (const key of parseDotEnvKeys(readFileSync(path, "utf8"))) declared.add(key);
  }
  return declared;
}

/**
 * Build the environment for the E2E `next dev` process.
 *
 * @param {object} params
 * @param {NodeJS.ProcessEnv} params.source          Parent environment.
 * @param {Record<string,string>} params.overrides   Approved app variables and values.
 * @param {string} params.projectRoot                Directory Next loads `.env*` from.
 * @returns {Record<string,string>}
 */
export function buildE2eAppEnv({ source = {}, overrides = {}, projectRoot = process.cwd() }) {
  const approved = new Set(APPROVED_APP_ENV_KEYS);

  for (const key of Object.keys(overrides)) {
    if (!approved.has(key)) refuse(`"${key}" is not an approved E2E application variable.`);
  }

  const databaseUrl = overrides.DATABASE_URL;
  const baseUrl = overrides.BASE_URL;
  if (!databaseUrl) refuse("DATABASE_URL override is required.");
  if (!baseUrl) refuse("BASE_URL override is required.");
  assertIsolatedDatabaseUrl(databaseUrl);
  assertIsolatedBaseUrl(baseUrl);

  const sessionSecret = overrides.SESSION_SECRET ?? "";
  if (sessionSecret.length < 16) refuse("SESSION_SECRET override must be at least 16 characters.");

  if ((overrides.NODE_ENV ?? "development") === "production") refuse("NODE_ENV must not be 'production' for the E2E app.");

  /** @type {Record<string,string>} */
  const env = Object.create(null);

  // 1. Operating-system passthrough only.
  for (const key of OS_PASSTHROUGH_KEYS) {
    const value = source[key];
    if (typeof value === "string" && value.length > 0) env[key] = value;
  }

  // 3. Pin every non-approved dotenv key to "" so @next/env cannot load it.
  for (const key of dotEnvDeclaredKeys(projectRoot)) {
    if (!approved.has(key)) env[key] = "";
  }

  // 2. Approved application variables (win over any "" pinned above).
  for (const [key, value] of Object.entries(overrides)) {
    env[key] = String(value);
  }

  // 4. Second layer: stop @next/env from processing dotenv files at all.
  env.__NEXT_PROCESSED_ENV = "true";
  if (!("NEXT_TELEMETRY_DISABLED" in env)) env.NEXT_TELEMETRY_DISABLED = "1";
  if (!("NODE_ENV" in env)) env.NODE_ENV = "development";

  // Return a plain object (spread copies own props without invoking any
  // "__proto__" setter) so child_process.spawn receives a normal env map.
  return { ...env };
}

/**
 * Fail closed if any known integration secret still carries a value. Approved
 * keys and empty pins are ignored.
 */
export function assertNoIntegrationSecrets(env) {
  const approved = new Set(APPROVED_APP_ENV_KEYS);
  const offenders = [];
  for (const [key, value] of Object.entries(env)) {
    if (approved.has(key) || OS_PASSTHROUGH_KEYS.includes(key)) continue;
    if (typeof value !== "string" || value.length === 0) continue;
    const upper = key.toUpperCase();
    if (INTEGRATION_SECRET_MARKERS.some((marker) => upper.includes(marker))) offenders.push(key);
  }
  if (offenders.length > 0) {
    refuse(`Refusing to start the E2E app: integration secret(s) present in its environment: ${offenders.join(", ")}.`);
  }
  return env;
}

export const __testables = { assertIsolatedDatabaseUrl, assertIsolatedBaseUrl, DOTENV_FILES, INTEGRATION_SECRET_MARKERS };
