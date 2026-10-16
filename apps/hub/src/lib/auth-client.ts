import { createAuthClient } from "better-auth/react";

/** Browser client for /api/auth on the same origin. */
export const authClient = createAuthClient();
