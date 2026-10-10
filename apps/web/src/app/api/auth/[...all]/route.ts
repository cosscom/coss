import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { withAuthRateLimit } from "@/lib/auth-rate-limit";
import { rateLimitRuntime } from "@/lib/rate-limit";

const handlers = toNextJsHandler(auth);

export const { GET, PATCH, PUT, DELETE } = handlers;
export const POST = withAuthRateLimit(handlers.POST, rateLimitRuntime);
