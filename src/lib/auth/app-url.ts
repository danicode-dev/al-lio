import "server-only";

// Same BASE_URL convention already used by the Google Calendar callback
// (src/app/api/google/calendar/callback/route.ts) - avoids inheriting the
// internal Docker bind address in production.
export function absoluteAppUrl(path: string): string {
  const base = process.env.BASE_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}

// Separate from BASE_URL on purpose: email clients fetch images over the
// public internet, so a logo URL built from BASE_URL breaks whenever the
// app itself is reached at a non-public origin (localhost, an internal
// Docker hostname, a nonstandard local test port). PUBLIC_ASSET_BASE_URL
// lets that one case be overridden independently; in every real deployment
// it is unset and this simply falls back to BASE_URL, which is already
// public there.
export function absolutePublicAssetUrl(path: string): string {
  const base = process.env.PUBLIC_ASSET_BASE_URL ?? process.env.BASE_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}
