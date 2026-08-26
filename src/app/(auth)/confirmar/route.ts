import { NextResponse } from "next/server";
import { confirmEmailToken } from "@/lib/auth/email-confirmation";

export const dynamic = "force-dynamic";

// A Route Handler, not a page: confirmEmailToken establishes the session on
// success, and Next.js only allows setting cookies from a Server Action or
// Route Handler, never from a Server Component's render (this was a real
// production error, caught live - see the commit message). Clicking the
// emailed link lands the visitor straight in the app, the same
// redirect-then-land pattern already used by the Google sign-in callback.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const baseUrl = process.env.BASE_URL ?? url.origin;
  const token = url.searchParams.get("token") ?? undefined;

  const result = await confirmEmailToken(token);

  if (result === "confirmed") {
    return NextResponse.redirect(new URL("/dashboard", baseUrl));
  }

  return NextResponse.redirect(new URL(`/login?error=confirm_${result}`, baseUrl));
}
