import { passkeyClient } from "@better-auth/passkey/client";
import { ssoClient } from "@better-auth/sso/client";
import { orgAc, orgRoles } from "@coss/auth/permissions";
import { adminClient, organizationClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/** Browser client for /api/auth on the same origin (no baseURL needed). */
export const authClient = createAuthClient({
  plugins: [
    organizationClient({ ac: orgAc, roles: orgRoles }),
    adminClient(),
    // The sign-in form handles `twoFactorRedirect` itself (no redirect page).
    twoFactorClient(),
    passkeyClient(),
    ssoClient({ domainVerification: { enabled: true } }),
  ],
});
