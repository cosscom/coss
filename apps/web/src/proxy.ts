import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

/** Reachable without a session cookie. /accept-invitation renders its own signed-out state. */
const PUBLIC_PATH_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/api/auth",
  "/accept-invitation",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Optimistic gate: only checks that a session cookie exists (no database call). Every layout,
 * page and server action still verifies the session itself.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isPublicPath(pathname) || getSessionCookie(request)) return NextResponse.next();

  const signIn = new URL("/sign-in", request.url);
  if (pathname !== "/") signIn.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(signIn);
}

export const config = {
  // Skip Next internals, the favicon and any path with a file extension (static assets).
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\..*).*)"],
};
