import { orgAc, orgRoles } from "@coss/auth/permissions";
import { adminClient, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/** Browser client for /api/auth on the same origin (no baseURL needed). */
export const authClient = createAuthClient({
  plugins: [organizationClient({ ac: orgAc, roles: orgRoles }), adminClient()],
});
