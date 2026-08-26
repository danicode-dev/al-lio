import "server-only";

// Same BASE_URL convention already used by the Google Calendar callback
// (src/app/api/google/calendar/callback/route.ts) - avoids inheriting the
// internal Docker bind address in production.
export function absoluteAppUrl(path: string): string {
  const base = process.env.BASE_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}
