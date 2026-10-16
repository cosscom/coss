import { DASHBOARD_PATH } from "@coss/auth/slugs";
import { isId } from "@coss/db/id";
import { Button } from "@coss/ui/components/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
import { isAPIError } from "better-auth/api";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AuthFrame } from "@/components/auth-frame";
import { SignOutButton } from "@/components/sign-out-button";
import { auth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { AcceptInvitationButton, SendVerificationEmailButton } from "./invitation-actions";

export const metadata: Metadata = { title: "Accept invitation" };

function InvitationCard(props: { title: string; description: ReactNode; children?: ReactNode }) {
  return (
    <AuthFrame>
      <Card>
        <CardHeader>
          <CardTitle>{props.title}</CardTitle>
          <CardDescription>{props.description}</CardDescription>
        </CardHeader>
        {props.children ? (
          <CardPanel className="flex flex-col gap-3">{props.children}</CardPanel>
        ) : null}
      </Card>
    </AuthFrame>
  );
}

/**
 * Public route (see proxy.ts). Better Auth requires a verified email to read or accept an
 * invitation, so the page walks the invitee through: sign in/up → verify → accept.
 */
export default async function AcceptInvitationPage({
  params,
}: PageProps<"/accept-invitation/[id]">) {
  const { id } = await params;
  if (!isId("invite", id)) notFound();
  const here = `/accept-invitation/${id}`;

  const session = await getSession();
  if (!session) {
    const next = `?next=${encodeURIComponent(here)}`;
    return (
      <InvitationCard
        description="Sign in or create an account with the email address the invitation was sent to."
        title="You've been invited to coss.com"
      >
        <Button render={<Link href={`/sign-in${next}`} />}>Sign in</Button>
        <Button render={<Link href={`/sign-up${next}`} />} variant="outline">
          Create an account
        </Button>
      </InvitationCard>
    );
  }

  if (!session.user.emailVerified) {
    return (
      <InvitationCard
        description={`Verify ${session.user.email} before accepting. Open the verification link, then come back to this page.`}
        title="Verify your email"
      >
        <SendVerificationEmailButton callbackURL={here} email={session.user.email} />
        <SignOutButton redirectTo={`/sign-in?next=${encodeURIComponent(here)}`} />
      </InvitationCard>
    );
  }

  let invitation: Awaited<ReturnType<typeof auth.api.getInvitation>>;
  try {
    invitation = await auth.api.getInvitation({ headers: await headers(), query: { id } });
  } catch (error) {
    if (!isAPIError(error)) throw error;
    return (
      <InvitationCard
        description={`${error.message || "This invitation is not available."} You are signed in as ${session.user.email}.`}
        title="Invitation unavailable"
      >
        <Button render={<Link href={DASHBOARD_PATH} />} variant="outline">
          Go to dashboard
        </Button>
        <SignOutButton redirectTo={`/sign-in?next=${encodeURIComponent(here)}`} />
      </InvitationCard>
    );
  }

  return (
    <InvitationCard
      description={`${invitation.inviterEmail} invited ${invitation.email} to join as ${invitation.role}.`}
      title={`Join ${invitation.organizationName}`}
    >
      <AcceptInvitationButton
        invitationId={invitation.id}
        organizationName={invitation.organizationName}
        organizationSlug={invitation.organizationSlug}
      />
    </InvitationCard>
  );
}
