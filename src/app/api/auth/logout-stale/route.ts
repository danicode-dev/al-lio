import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// Exists only so getGlobalStore (src/lib/data.ts) can clear a revoked
// session's cookie. redirect() alone is fine from a Server Component, but
// cookies().delete() is not - Next.js only allows cookie mutation from a
// Server Action or Route Handler (the exact error this fixes, caught live
// - see the commit message). Without an actual clear, the stale-but-
// still-signature-valid cookie would bounce forever between middleware
// (session looks valid, redirects /login back to /dashboard) and
// getGlobalStore (stamp mismatch, redirects here again).
export async function GET(req: Request) {
  await clearSession();
  return NextResponse.redirect(new URL("/login", req.url));
}
