import { revokeMobileSession } from "@coss/auth/mobile";
import { bearerToken, MobileApiError, mobileRoute } from "@/lib/mobile-api";

export const dynamic = "force-dynamic";

export const POST = mobileRoute(async (request) => {
  const token = bearerToken(request);
  if (!token || !(await revokeMobileSession(token))) {
    throw new MobileApiError(401, "unauthorized", "Not signed in.");
  }
  return { signed_out: true };
});
