import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { google } from "googleapis";

const TOKEN_COOKIE = "d1os_google_calendar";
const STATE_COOKIE = "d1os_google_calendar_state";
const REDIRECT_COOKIE = "d1os_google_calendar_redirect";
const RETURN_COOKIE = "d1os_google_calendar_return";
const DEFAULT_RETURN_PATH = "/calendar";
const USE_SECURE_COOKIES = process.env.NODE_ENV === "production";
const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.events",
];

type StoredGoogleTokens = {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
  scope?: string;
  token_type?: string | null;
};

// The encrypted cookie payload always carries the AL-LÍO user id that
// completed the OAuth callback. A credential is only usable by that exact
// user; anything else (no owner field, or a different owner) fails closed
// and must be reconnected (issue #280).
type CalendarCredential = {
  owner: string;
  tokens: StoredGoogleTokens;
};

type CredentialRead =
  | { status: "ok"; tokens: StoredGoogleTokens }
  | { status: "none" }
  | { status: "legacy" }
  | { status: "mismatch" };

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function getRedirectUri(): string {
  return process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/google/calendar/callback";
}

function getEncryptionKey(): Buffer {
  const secret = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY ?? process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("Missing GOOGLE_TOKEN_ENCRYPTION_KEY");
  return crypto.createHash("sha256").update(secret).digest();
}

function normalizeReturnPath(value?: string | null): string {
  if (!value) return DEFAULT_RETURN_PATH;

  try {
    const url = new URL(value, "http://al-lio.local");
    if (url.origin !== "http://al-lio.local") return DEFAULT_RETURN_PATH;
    if (!url.pathname.startsWith("/") || url.pathname.startsWith("//")) return DEFAULT_RETURN_PATH;
    if (url.pathname.startsWith("/api/")) return DEFAULT_RETURN_PATH;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_RETURN_PATH;
  }
}

function withGoogleStatus(path: string, status: string): string {
  const url = new URL(path, "http://al-lio.local");
  url.searchParams.set("google", status);
  return `${url.pathname}${url.search}${url.hash}`;
}

function encryptCredential(credential: CalendarCredential): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(credential), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

// Decrypts and authenticates the cookie. Returns the parsed JSON untyped so
// the caller can tell an owner-bound credential apart from a legacy
// (pre-#280) unbound one.
function decryptCredentialPayload(value?: string): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const raw = Buffer.from(value, "base64url");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const encrypted = raw.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
    decipher.setAuthTag(tag);
    const text = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function readCalendarCredential(ownerUid: string): Promise<CredentialRead> {
  const cookieStore = await cookies();
  const payload = decryptCredentialPayload(cookieStore.get(TOKEN_COOKIE)?.value);
  if (!payload) return { status: "none" };

  const owner = payload.owner;
  const tokens = payload.tokens as StoredGoogleTokens | undefined;
  // A pre-#280 cookie is the flat token object with no `owner`/`tokens`
  // wrapper. Never guess its owner.
  if (typeof owner !== "string" || owner.length === 0 || !tokens || typeof tokens !== "object") {
    return { status: "legacy" };
  }
  if (owner !== ownerUid) return { status: "mismatch" };
  if (!tokens.access_token && !tokens.refresh_token) return { status: "none" };
  return { status: "ok", tokens };
}

export function createGoogleOAuthClient(redirectUri = getRedirectUri()) {
  return new google.auth.OAuth2(
    requiredEnv("GOOGLE_CLIENT_ID"),
    requiredEnv("GOOGLE_CLIENT_SECRET"),
    redirectUri,
  );
}

export async function createGoogleAuthUrl(returnTo?: string | null): Promise<string> {
  const cookieStore = await cookies();
  const state = crypto.randomBytes(24).toString("base64url");
  const redirectUri = getRedirectUri();
  const safeReturnPath = normalizeReturnPath(returnTo);

  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: USE_SECURE_COOKIES,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  cookieStore.set(REDIRECT_COOKIE, redirectUri, {
    httpOnly: true,
    secure: USE_SECURE_COOKIES,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  cookieStore.set(RETURN_COOKIE, safeReturnPath, {
    httpOnly: true,
    secure: USE_SECURE_COOKIES,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });

  return createGoogleOAuthClient(redirectUri).generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: true,
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

export async function getGoogleRedirectUriFromCookie(): Promise<string> {
  const cookieStore = await cookies();
  const redirectUri = cookieStore.get(REDIRECT_COOKIE)?.value ?? getRedirectUri();
  cookieStore.delete(REDIRECT_COOKIE);
  return redirectUri;
}

export async function getGoogleReturnPathFromCookie(status = "connected"): Promise<string> {
  const cookieStore = await cookies();
  const returnPath = normalizeReturnPath(cookieStore.get(RETURN_COOKIE)?.value);
  cookieStore.delete(RETURN_COOKIE);
  return withGoogleStatus(returnPath, status);
}

export async function assertGoogleOAuthState(state: string | null): Promise<boolean> {
  const cookieStore = await cookies();
  const expected = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);
  return Boolean(state && expected && state === expected);
}

export async function saveGoogleTokens(ownerUid: string, tokens: StoredGoogleTokens): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_COOKIE, encryptCredential({ owner: ownerUid, tokens }), {
    httpOnly: true,
    secure: USE_SECURE_COOKIES,
    sameSite: "lax",
    path: "/",
    priority: "high",
    maxAge: 60 * 60 * 24 * 90,
  });
}

export async function clearGoogleTokens(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_COOKIE);
}

// Legacy (unbound) or another user's credential is refused here and must be
// cleared by the caller so the user is prompted to reconnect (issue #280).
export type CalendarCredentialStatus = CredentialRead["status"];

export async function getCalendarCredentialStatus(ownerUid: string): Promise<CalendarCredentialStatus> {
  return (await readCalendarCredential(ownerUid)).status;
}

async function getGoogleOAuthClient(ownerUid: string) {
  const read = await readCalendarCredential(ownerUid);
  if (read.status !== "ok") return null;

  const tokens = read.tokens;
  const auth = createGoogleOAuthClient();
  auth.setCredentials(tokens);

  auth.on("tokens", async (newTokens) => {
    await saveGoogleTokens(ownerUid, {
      ...tokens,
      ...newTokens,
      refresh_token: newTokens.refresh_token ?? tokens.refresh_token,
    });
  });

  return auth;
}

export async function getGoogleCalendarClient(ownerUid: string) {
  const auth = await getGoogleOAuthClient(ownerUid);
  if (!auth) return null;
  return google.calendar({ version: "v3", auth });
}
