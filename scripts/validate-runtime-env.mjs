/** Validates runtime configuration without printing secrets. */

const errors = [];
const production = process.env.NODE_ENV === "production";

const databaseUrl = parseUrl("DATABASE_URL", true);
const baseUrl = parseUrl("BASE_URL", true);
const googleRedirect = parseUrl("GOOGLE_REDIRECT_URI", production);

if (databaseUrl && production && decodeURIComponent(databaseUrl.username) !== "al_lio_app") {
  errors.push("DATABASE_URL debe usar al_lio_app en producción");
}
if (baseUrl && production && baseUrl.protocol !== "https:") {
  errors.push("BASE_URL debe usar HTTPS en producción");
}
if (googleRedirect && baseUrl && googleRedirect.origin !== baseUrl.origin) {
  errors.push("GOOGLE_REDIRECT_URI debe compartir origen con BASE_URL");
}
if (googleRedirect && !googleRedirect.pathname.endsWith("/api/google/calendar/callback")) {
  errors.push("GOOGLE_REDIRECT_URI debe terminar en /api/google/calendar/callback");
}

requiredSecret("SESSION_SECRET", production ? 32 : 16);
requiredSecret("AL_LIO_RADAR_WEBHOOK_SECRET", 32);

const googleValues = [
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_TOKEN_ENCRYPTION_KEY,
  process.env.GOOGLE_REDIRECT_URI,
];
const configuredGoogleValues = googleValues.filter((value) => Boolean(value?.trim())).length;
if (configuredGoogleValues !== 0 && configuredGoogleValues !== googleValues.length) {
  errors.push("Las variables de Google deben configurarse todas juntas");
}
if (production && configuredGoogleValues !== googleValues.length) {
  errors.push("La integración Google debe estar configurada en producción");
}
if (process.env.GOOGLE_TOKEN_ENCRYPTION_KEY && process.env.GOOGLE_TOKEN_ENCRYPTION_KEY.length < 32) {
  errors.push("GOOGLE_TOKEN_ENCRYPTION_KEY debe tener al menos 32 caracteres");
}

const demoFlag = process.env.AL_LIO_DEMO_ACCESS_ENABLED?.trim().toLowerCase();
if (demoFlag && demoFlag !== "true" && demoFlag !== "false") {
  errors.push("AL_LIO_DEMO_ACCESS_ENABLED debe ser true o false");
}

integer("PG_POOL_MAX", 1, 50);
integer("PG_IDLE_TIMEOUT_MS", 1_000, 300_000);
integer("PG_CONNECTION_TIMEOUT_MS", 500, 60_000);
integer("PG_STATEMENT_TIMEOUT_MS", 1_000, 120_000);

if (errors.length > 0) {
  console.error("Configuración de runtime inválida:");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log("OK: configuración de runtime validada.");

function parseUrl(name, required) {
  const value = process.env[name]?.trim();
  if (!value) {
    if (required) errors.push(`${name} es obligatoria`);
    return null;
  }
  if (value.includes("REPLACE_ME")) {
    errors.push(`${name} contiene un placeholder`);
    return null;
  }
  try {
    const url = new URL(value);
    if (name.includes("DATABASE") && !["postgres:", "postgresql:"].includes(url.protocol)) {
      errors.push(`${name} debe usar postgresql://`);
    }
    return url;
  } catch {
    errors.push(`${name} no es una URL válida`);
    return null;
  }
}

function requiredSecret(name, minimumLength) {
  const value = process.env[name];
  if (!value || value.includes("REPLACE_ME") || value.length < minimumLength) {
    errors.push(`${name} debe tener al menos ${minimumLength} caracteres y no usar placeholders`);
  }
}

function integer(name, minimum, maximum) {
  const raw = process.env[name];
  if (!raw) return;
  const normalized = raw.trim();
  const value = /^\d+$/.test(normalized) ? Number(normalized) : Number.NaN;
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    errors.push(`${name} debe estar entre ${minimum} y ${maximum}`);
  }
}
