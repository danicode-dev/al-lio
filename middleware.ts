import { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
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
    "/login",
    "/register",
  ],
};
