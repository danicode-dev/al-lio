import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session-token";

const privatePathPrefixes = [
  "/dashboard",
  "/onboarding",
  "/profile",
  "/work",
  "/courses",
  "/hackathons",
  "/tasks",
  "/calendar",
  "/links",
  "/sources",
  "/settings",
  "/bloc",
  "/noticias",
  "/more",
];

const authPaths = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const privatePath = privatePathPrefixes.some((path) => pathname.startsWith(path));
  const authPath = authPaths.includes(pathname);

  if (!privatePath && !authPath) {
    return NextResponse.next();
  }

  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session && privatePath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (session && authPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/profile/:path*",
    "/work/:path*",
    "/courses/:path*",
    "/hackathons/:path*",
    "/tasks/:path*",
    "/calendar/:path*",
    "/links/:path*",
    "/sources/:path*",
    "/settings/:path*",
    "/bloc/:path*",
    "/noticias/:path*",
    "/more/:path*",
    "/login",
    "/register",
  ],
};
