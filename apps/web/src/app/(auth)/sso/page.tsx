import { ORG_SLUG_PATTERN } from "@coss/auth/slugs";
import type { Metadata } from "next";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { getSession } from "@/lib/session";
import { SsoForm } from "./sso-form";

export const metadata: Metadata = { title: "Sign in with SSO" };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Public, and reachable while signed in: members of an organization that requires SSO are sent
 * here (`?org=<slug>`) when their session didn't come from its provider. Better Auth redirects
 * failed SSO sign-ins back here with `?error=`.
 */
export default async function SsoPage({ searchParams }: PageProps<"/sso">) {
  const params = await searchParams;
  const orgParam = first(params.org);
  const org = orgParam && ORG_SLUG_PATTERN.test(orgParam) ? orgParam : null;
  const next = safeRedirectPath(first(params.next), org ? `/${org}` : undefined);
  const session = await getSession();
  return (
    <SsoForm
      error={first(params.error) ?? null}
      next={next}
      org={org}
      signedInAs={session?.user.email ?? null}
    />
  );
}
