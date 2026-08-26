export type SessionPayload = {
  uid: string;
  email: string;
  name?: string;
  // security_stamp at issuance time. Compared against the user's current
  // stamp wherever a session is resolved with a database round trip
  // already in flight (getGlobalStore) - a mismatch means the session was
  // revoked (e.g. a password reset) and must be treated as logged out,
  // even though the signature itself still verifies. Middleware's Edge
  // runtime has no database access, so it intentionally checks only the
  // signature - see 0009_production_authentication.sql.
  sv: string;
  exp: number;
};

const encoder = new TextEncoder();

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  const minimumLength = process.env.NODE_ENV === "production" ? 32 : 16;
  if (!secret || secret.length < minimumLength) {
    throw new Error(`SESSION_SECRET is not configured securely (minimum ${minimumLength} characters)`);
  }
  return secret;
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 = typeof btoa === "function" ? btoa(binary) : Buffer.from(bytes).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  if (typeof atob === "function") {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  return new Uint8Array(Buffer.from(padded, "base64"));
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  const key = await importKey(getSecret());
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  try {
    const key = await importKey(getSecret());
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(parts[1]).buffer as ArrayBuffer,
      encoder.encode(parts[0]),
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(parts[0]))) as SessionPayload;
    if (!payload.uid || !payload.email || !payload.sv) return null;
    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "al_lio_session";
