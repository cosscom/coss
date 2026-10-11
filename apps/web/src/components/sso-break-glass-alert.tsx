import { Alert, AlertDescription, AlertTitle } from "@coss/ui/components/alert";
import Link from "next/link";

/** Shown to owners who opened an organization that requires SSO without signing in with it. */
export function SsoBreakGlassAlert({ orgSlug }: { orgSlug: string }) {
  return (
    <Alert variant="warning">
      <AlertTitle>You're using break-glass access</AlertTitle>
      <AlertDescription>
        <span>
          This organization requires SSO, but you signed in another way. As an owner you can still
          open it, for example to fix the identity provider.{" "}
          <Link className="underline" href={`/sso?org=${orgSlug}`}>
            Sign in with SSO
          </Link>
        </span>
      </AlertDescription>
    </Alert>
  );
}
