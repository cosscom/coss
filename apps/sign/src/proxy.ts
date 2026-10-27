import { findSignBuilderSession, findSignSession, getSignSettings } from "@coss/sign";
import { type NextRequest, NextResponse } from "next/server";
import { securityHeaders } from "@/lib/security-headers";

const dev = process.env.NODE_ENV === "development";
const SESSION_PAGE = /^\/s\/(sgs_[0-9a-z]{26})\/?$/;
const BUILDER_PAGE = /^\/b\/(sbs_[0-9a-z]{26})\/?$/;

/**
 * Sets every response's security headers. A session's page (signing or builder) may be framed by the origins its
 * environment allows; the session id in its path is not a secret (the token is in the fragment,
 * which never reaches a server), so this lookup reveals nothing but who may embed it.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  let frameAncestors: string[] = [];
  const signing = SESSION_PAGE.exec(request.nextUrl.pathname)?.[1];
  const building = BUILDER_PAGE.exec(request.nextUrl.pathname)?.[1];
  if (signing || building) {
    const session = signing
      ? await findSignSession(signing).catch(() => null)
      : await findSignBuilderSession(building ?? "").catch(() => null);
    if (session && session.expiresAt > new Date()) {
      const settings = await getSignSettings({
        organizationId: session.organizationId,
        environmentId: session.environmentId,
      }).catch(() => null);
      frameAncestors = settings?.allowedOrigins ?? [];
    }
  }
  for (const [name, value] of Object.entries(securityHeaders({ dev, frameAncestors }))) {
    response.headers.set(name, value);
  }
  return response;
}

export const config = {
  // Static assets need no policy of their own.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
