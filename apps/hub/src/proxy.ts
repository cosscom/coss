import { type NextRequest, NextResponse } from "next/server";
import { securityHeaders } from "@/lib/security-headers";

const dev = process.env.NODE_ENV === "development";

/** Sets every response's security headers. */
export function proxy(_request: NextRequest) {
  const response = NextResponse.next();
  for (const [name, value] of Object.entries(securityHeaders({ dev }))) {
    response.headers.set(name, value);
  }
  return response;
}

export const config = {
  // Static assets need no policy of their own.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
