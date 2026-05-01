import { NextResponse } from "next/server";
import { google } from "googleapis";
import { ensureSupabaseSessionFromGoogle } from "@/lib/auth/google";
import {
  assertGoogleOAuthState,
  createGoogleOAuthClient,
  getGoogleRedirectUriFromCookie,
  getGoogleReturnPathFromCookie,
  saveGoogleTokens,
} from "@/lib/google/calendar";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code) {
    return NextResponse.redirect(new URL(await getGoogleReturnPathFromCookie("missing_code"), req.url));
  }

  if (!(await assertGoogleOAuthState(state))) {
    return NextResponse.redirect(new URL(await getGoogleReturnPathFromCookie("invalid_state"), req.url));
  }

  const oauth = createGoogleOAuthClient(await getGoogleRedirectUriFromCookie());

  try {
    const { tokens } = await oauth.getToken(code);
    oauth.setCredentials(tokens);

    const userInfo = await google.oauth2({ version: "v2", auth: oauth }).userinfo.get();
    await ensureSupabaseSessionFromGoogle({
      email: userInfo.data.email,
      emailVerified: userInfo.data.verified_email,
      name: userInfo.data.name,
      picture: userInfo.data.picture,
    });

    await saveGoogleTokens(tokens);
    return NextResponse.redirect(new URL(await getGoogleReturnPathFromCookie("connected"), req.url));
  } catch {
    return NextResponse.redirect(new URL(await getGoogleReturnPathFromCookie("connect_error"), req.url));
  }
}
