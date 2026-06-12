import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createSession } from "@/lib/auth/session";
import { ensureUserByEmail } from "@/lib/db/repositories/users";
import { upsertProfile } from "@/lib/db/repositories/profiles";
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
  // Use BASE_URL from env to avoid inheriting the internal Docker bind address (0.0.0.0:3000).
  const baseUrl = process.env.BASE_URL ?? url.origin;
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
    oauth.setCredentials(tokens);

    const userInfo = await google.oauth2({ version: "v2", auth: oauth }).userinfo.get();
    const email = userInfo.data.email;
    if (!email || userInfo.data.verified_email === false) {
      return NextResponse.redirect(new URL(await getGoogleReturnPathFromCookie("connect_error"), baseUrl));
    }

    const displayName = userInfo.data.name?.trim() || email.split("@")[0];
    const user = await ensureUserByEmail(email, displayName);
    await upsertProfile(user.id, {
      display_name: displayName,
      full_name: userInfo.data.name ?? displayName,
      target_role: "Usuario D1OS",
      main_location: "Granada",
    });
    await createSession({ id: user.id, email: user.email, name: user.display_name ?? displayName });

    await saveGoogleTokens(tokens);
    return NextResponse.redirect(new URL(await getGoogleReturnPathFromCookie("connected"), baseUrl));
  } catch {
    return NextResponse.redirect(new URL(await getGoogleReturnPathFromCookie("connect_error"), baseUrl));
  }
}
