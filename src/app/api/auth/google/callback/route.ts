import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth/session";
import { resolveOrProvisionGoogleUser } from "@/lib/auth/google-signin";
import {
  assertGoogleIdentityState,
  consumeGoogleIdentityVerifier,
  exchangeGoogleIdentityCode,
  getGoogleIdentityReturnPath,
} from "@/lib/google/identity";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const baseUrl = process.env.BASE_URL ?? url.origin;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code) {
    return NextResponse.redirect(new URL(await getGoogleIdentityReturnPath("google_missing_code"), baseUrl));
  }

  if (!(await assertGoogleIdentityState(state))) {
    return NextResponse.redirect(new URL(await getGoogleIdentityReturnPath("google_invalid_state"), baseUrl));
  }

  const codeVerifier = await consumeGoogleIdentityVerifier();
  if (!codeVerifier) {
    return NextResponse.redirect(new URL(await getGoogleIdentityReturnPath("google_invalid_state"), baseUrl));
  }

  try {
    const identity = await exchangeGoogleIdentityCode(code, codeVerifier);
    if (!identity) {
      return NextResponse.redirect(new URL(await getGoogleIdentityReturnPath("google_connect_error"), baseUrl));
    }

    const user = await resolveOrProvisionGoogleUser(identity);
    await createSession({
      id: user.id,
      email: user.email,
      name: user.display_name,
      securityStamp: user.security_stamp,
    });

    return NextResponse.redirect(new URL(await getGoogleIdentityReturnPath("connected"), baseUrl));
  } catch {
    return NextResponse.redirect(new URL(await getGoogleIdentityReturnPath("google_connect_error"), baseUrl));
  }
}
