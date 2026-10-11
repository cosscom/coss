import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { withAuthRateLimit, withScimRateLimit } from "@/lib/auth-rate-limit";
import { rateLimitRuntime } from "@/lib/rate-limit";

const handlers = toNextJsHandler(auth);

// SCIM (directory sync) uses every method; the credential endpoints are POSTs.
export const GET = withScimRateLimit(handlers.GET, rateLimitRuntime);
export const PUT = withScimRateLimit(handlers.PUT, rateLimitRuntime);
export const PATCH = withScimRateLimit(handlers.PATCH, rateLimitRuntime);
export const DELETE = withScimRateLimit(handlers.DELETE, rateLimitRuntime);
export const POST = withScimRateLimit(
  withAuthRateLimit(handlers.POST, rateLimitRuntime),
  rateLimitRuntime,
);
