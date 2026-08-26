import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { google } from "googleapis";
import { CodeChallengeMethod } from "google-auth-library";

// Deliberately separate from src/lib/google/calendar.ts's cookies and
// state: this is the login identity flow (issue #132), requesting only
// openid/email/profile and using PKCE. It reuses the same GOOGLE_CLIENT_ID/
// GOOGLE_CLIENT_SECRET Google Cloud OAuth client as Calendar - only the
// redirect URI, scope and cookie namespace differ - so this needs one
// additional authorized redirect URI registered in Google Cloud Console,
// not a second OAuth client.
const STATE_COOKIE = "d1os_google_identity_state";
const VERIFIER_COOKIE = "d1os_google_identity_verifier";
const RETURN_COOKIE = "d1os_google_identity_return";
const DEFAULT_RETURN_PATH = "/dashboard";
const USE_SECURE_COOKIES = process.env.NODE_ENV === "production";
const SCOPES = ["openid", "email", "profile"];

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function getRedirectUri(): string {
  return process.env.GOOGLE_IDENTITY_REDIRECT_URI ?? "http://localhost:3000/api/auth/google/callback";
}

function createOAuthClient() {
  return new google.auth.OAuth2(
    requiredEnv("GOOGLE_CLIENT_ID"),
    requiredEnv("GOOGLE_CLIENT_SECRET"),
    getRedirectUri(),
  );
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

function withStatus(path: string, status: string): string {
  const url = new URL(path, "http://al-lio.local");
  url.searchParams.set("google", status);
  return `${url.pathname}${url.search}${url.hash}`;
}

export async function createGoogleIdentityAuthUrl(returnTo?: string | null): Promise<string> {
  const cookieStore = await cookies();
  const state = crypto.randomBytes(24).toString("base64url");
  const client = createOAuthClient();
  const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();

  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true, secure: USE_SECURE_COOKIES, sameSite: "lax", path: "/", maxAge: 10 * 60,
  });
  cookieStore.set(VERIFIER_COOKIE, codeVerifier, {
    httpOnly: true, secure: USE_SECURE_COOKIES, sameSite: "lax", path: "/", maxAge: 10 * 60,
  });
  cookieStore.set(RETURN_COOKIE, normalizeReturnPath(returnTo), {
    httpOnly: true, secure: USE_SECURE_COOKIES, sameSite: "lax", path: "/", maxAge: 10 * 60,
  });

  return client.generateAuthUrl({
    access_type: "online",
    scope: SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: CodeChallengeMethod.S256,
  });
}

export async function assertGoogleIdentityState(state: string | null): Promise<boolean> {
  const cookieStore = await cookies();
  const expected = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);
  return Boolean(state && expected && state === expected);
}

export async function consumeGoogleIdentityVerifier(): Promise<string | null> {
  const cookieStore = await cookies();
  const verifier = cookieStore.get(VERIFIER_COOKIE)?.value ?? null;
  cookieStore.delete(VERIFIER_COOKIE);
  return verifier;
}

export async function getGoogleIdentityReturnPath(status: string): Promise<string> {
  const cookieStore = await cookies();
  const returnPath = normalizeReturnPath(cookieStore.get(RETURN_COOKIE)?.value);
  cookieStore.delete(RETURN_COOKIE);
  return withStatus(returnPath, status);
}

export type GoogleIdentity = { providerUserId: string; email: string; displayName: string | null };

export async function exchangeGoogleIdentityCode(code: string, codeVerifier: string): Promise<GoogleIdentity | null> {
  const client = createOAuthClient();
  const { tokens } = await client.getToken({ code, codeVerifier });
  client.setCredentials(tokens);

  const userInfo = await google.oauth2({ version: "v2", auth: client }).userinfo.get();
  if (!userInfo.data.id || !userInfo.data.email || userInfo.data.verified_email !== true) {
    return null;
  }

  return {
    providerUserId: userInfo.data.id,
    email: userInfo.data.email,
    displayName: userInfo.data.name?.trim() || null,
  };
}
