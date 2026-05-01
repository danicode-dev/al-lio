import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

const privatePathPrefixes = [
  "/dashboard",
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
];

const authPaths = ["/login", "/register"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  const privatePath = privatePathPrefixes.some((path) => pathname.startsWith(path));
  const authPath = authPaths.includes(pathname);

  if (!privatePath && !authPath) {
    return response;
  }

  const supabaseUrl = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();
  const hasSupabaseEnv = supabaseUrl && publishableKey;

  if (!hasSupabaseEnv) {
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    publishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && privatePath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && authPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
