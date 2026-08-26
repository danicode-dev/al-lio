import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  assertGoogleOAuthState,
  createGoogleOAuthClient,
  getGoogleRedirectUriFromCookie,
  getGoogleReturnPathFromCookie,
  saveGoogleTokens,
} from "@/lib/google/calendar";

export const dynamic = "force-dynamic";

// Calendar consent only - identity/session creation is handled entirely by
// the separate /api/auth/google/* flow before a user ever reaches here
// (issue #132). This callback no longer creates or links a user account;
// it just stores Calendar tokens for the browser that already has a valid
// AL-LÍO session.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const baseUrl = process.env.BASE_URL ?? url.origin;

  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code) {
    return NextResponse.redirect(new URL(await getGoogleReturnPathFromCookie("missing_code"), baseUrl));
  }

  if (!(await assertGoogleOAuthState(state))) {
    return NextResponse.redirect(new URL(await getGoogleReturnPathFromCookie("invalid_state"), baseUrl));
  }

  const oauth = createGoogleOAuthClient(await getGoogleRedirectUriFromCookie());

  try {
    const { tokens } = await oauth.getToken(code);
    await saveGoogleTokens(tokens);
    return NextResponse.redirect(new URL(await getGoogleReturnPathFromCookie("connected"), baseUrl));
  } catch {
    return NextResponse.redirect(new URL(await getGoogleReturnPathFromCookie("connect_error"), baseUrl));
  }
}
