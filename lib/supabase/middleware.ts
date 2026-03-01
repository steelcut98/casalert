import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Creates a Supabase client for middleware. Reads cookies from the request
 * and writes updated session cookies to the response.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired; cookies are updated on response
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect dashboard, onboarding, and settings
  const isProtected =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname === "/onboarding" ||
    request.nextUrl.pathname === "/settings";
  const isAuthRoute =
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname.startsWith("/auth/");

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && user && request.nextUrl.pathname === "/login") {
    const redirectTo = request.nextUrl.searchParams.get("redirectTo") ?? "/dashboard";
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  return response;
}
