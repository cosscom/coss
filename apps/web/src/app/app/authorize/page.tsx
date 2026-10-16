import { isAuthorizationState, isCodeChallenge, MOBILE_REDIRECT_URI } from "@coss/auth/mobile";
import { Avatar, AvatarFallback } from "@coss/ui/components/avatar";
import { Button } from "@coss/ui/components/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
import { CheckIcon, XIcon } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AuthFrame } from "@/components/auth-frame";
import { initials } from "@/components/shell/initials";
import { SignOutButton } from "@/components/sign-out-button";
import { getSession } from "@/lib/session";
import { AuthorizeForm } from "./authorize-form";
import { appSignInRefusal } from "./refusal";

export const metadata: Metadata = { title: "Sign in to the coss.com app" };

function AuthorizeCard(props: { title: string; description: ReactNode; children?: ReactNode }) {
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

const GRANTS = [
  { allowed: true, text: "See your organizations, projects and environments" },
  { allowed: true, text: "See email activity, delivery events and sending reputation" },
  { allowed: false, text: "Change settings, send email or see API keys" },
];

function param(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

/** Opened by the iOS app in a browser sheet; approving hands it a one-time PKCE code. */
export default async function AuthorizeAppPage({ searchParams }: PageProps<"/app/authorize">) {
  const search = await searchParams;
  const codeChallenge = param(search.code_challenge);
  const state = param(search.state);
  if (!isCodeChallenge(codeChallenge) || !isAuthorizationState(state)) {
    return (
      <AuthorizeCard
        description="This sign-in link is incomplete. Close this window and start again from the app."
        title="Invalid sign-in link"
      />
    );
  }

  const here = `/app/authorize?${new URLSearchParams({ code_challenge: codeChallenge, state })}`;
  const session = await getSession();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(here)}`);

  const refusal = appSignInRefusal(session);
  const cancelUrl = `${MOBILE_REDIRECT_URI}?${new URLSearchParams({ error: "access_denied", state })}`;
  const next = `/sign-in?next=${encodeURIComponent(here)}`;
  if (refusal) {
    return (
      <AuthorizeCard description={refusal} title="Sign in to the coss.com app">
        <SignOutButton redirectTo={next} />
      </AuthorizeCard>
    );
  }
  return (
    <AuthorizeCard
      description="Approve the iOS app to see this account's organizations on your phone."
      title="Sign in to the coss.com app"
    >
      <div className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 shadow-xs/5">
        <Avatar className="size-9 rounded-lg border bg-background">
          <AvatarFallback className="rounded-lg bg-transparent">
            {initials(session.user.name || session.user.email)}
          </AvatarFallback>
        </Avatar>
        <div className="grid min-w-0 flex-1 leading-tight">
          <span className="truncate font-medium text-sm">{session.user.name}</span>
          <span className="truncate text-muted-foreground text-xs">{session.user.email}</span>
        </div>
        <SignOutButton redirectTo={next} />
      </div>
      <ul className="flex flex-col gap-2 py-1 text-sm">
        {GRANTS.map((grant) => (
          <li className="flex items-start gap-2.5" key={grant.text}>
            {grant.allowed ? (
              <CheckIcon aria-label="Allowed" className="mt-0.5 size-4 shrink-0 text-success" />
            ) : (
              <XIcon
                aria-label="Not allowed"
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              />
            )}
            <span className={grant.allowed ? undefined : "text-muted-foreground"}>
              {grant.text}
            </span>
          </li>
        ))}
      </ul>
      <AuthorizeForm codeChallenge={codeChallenge} state={state} />
      <Button render={<a href={cancelUrl} />} variant="ghost">
        Cancel
      </Button>
      <p className="text-center text-muted-foreground text-xs">
        Signed-in devices are listed under Settings → Sessions, where you can revoke them.
      </p>
    </AuthorizeCard>
  );
}
