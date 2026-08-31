import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, signSessionToken, verifySessionToken, type SessionPayload } from "@/lib/auth/session-token";
import { getUserById } from "@/lib/db/repositories/users";

const SESSION_DAYS = 30;

export async function createSession(user: { id: string; email: string; name?: string | null; securityStamp: string }): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60;
  const token = await signSessionToken({
    uid: user.id,
    email: user.email,
    name: user.name ?? undefined,
    sv: user.securityStamp,
    exp,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    priority: "high",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

// Use this at every authorization boundary outside middleware. Middleware
// intentionally performs signature-only verification because the Edge
// runtime has no PostgreSQL connection; server components, actions and route
// handlers must also compare the database-backed stamp so a password reset
// revokes direct action/API calls, not just normal dashboard navigation.
export async function getValidatedSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session) return null;

  const user = await getUserById(session.uid);
  if (!user || user.security_stamp !== session.sv) {
    // Clear the still-valid signed cookie through a Route Handler. Sending a
    // stale cookie straight to /login would loop because middleware can only
    // see its valid signature and would redirect it back to /dashboard.
    redirect("/api/auth/logout-stale");
  }

  return session;
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  // Both sign-out paths (the sign-out action and /api/auth/logout-stale) run
  // through here, so dropping the Google Calendar credential cookie here means
  // sign-out and stale-session cleanup can never leave a usable Calendar
  // capability behind for the next user of a shared browser (issue #280). The
  // cookie name is owned by src/lib/google/calendar.ts.
  cookieStore.delete("d1os_google_calendar");
}
