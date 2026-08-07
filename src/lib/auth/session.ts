import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, signSessionToken, verifySessionToken, type SessionPayload } from "@/lib/auth/session-token";

const SESSION_DAYS = 30;

export async function createSession(user: { id: string; email: string; name?: string | null }): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60;
  const token = await signSessionToken({
    uid: user.id,
    email: user.email,
    name: user.name ?? undefined,
    exp,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
