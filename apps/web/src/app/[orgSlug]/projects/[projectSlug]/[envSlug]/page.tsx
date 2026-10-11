import { API_KEY_PREFIX } from "@coss/auth/constants";
import { type EmailObjectOutput, listDomains, listEmails } from "@coss/email";
import { getEnvironment, listEnvironmentApiKeys, listEnvironments } from "@coss/tenancy";
import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@coss/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { EmailStatusBadge, ModeBadge, SandboxBadge } from "@/components/email-badges";
import { PageHeader } from "@/components/page-header";
import { env } from "@/env";
import { formatDateTime } from "@/lib/format";
import { liveKeyRestriction } from "@/lib/live-keys";
import { requireOrgMember } from "@/lib/session";
import { CreateApiKeyDialog, CreateApiKeyUnavailable } from "./create-api-key-dialog";
import { RevokeApiKeyButton } from "./revoke-api-key-button";

export const metadata: Metadata = { title: "Environment" };

function quickStartCurl(apiUrl: string, from: string): string {
  return [
    `curl -X POST ${apiUrl}/v1/emails \\`,
    `  -H "Authorization: Bearer $COSS_API_KEY" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '{`,
    `    "from": "Acme <${from}>",`,
    `    "to": "delivered@example.com",`,
    `    "subject": "Hello from COSS",`,
    `    "html": "<p>It works!</p>"`,
    `  }'`,
  ].join("\n");
}

/** "2 opens · 1 click" for tracked emails, "—" for untracked ones. */
function engagement({ tracking }: EmailObjectOutput): string {
  const parts = [
    tracking.opens
      ? `${tracking.open_count} ${tracking.open_count === 1 ? "open" : "opens"}`
      : null,
    tracking.clicks
      ? `${tracking.click_count} ${tracking.click_count === 1 ? "click" : "clicks"}`
      : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export default async function EnvironmentPage({
  params,
}: PageProps<"/[orgSlug]/projects/[projectSlug]/[envSlug]">) {
  const { orgSlug, projectSlug, envSlug } = await params;
  const { session, organization, can } = await requireOrgMember(orgSlug);
  const found = await getEnvironment({ organizationId: organization.id, projectSlug, envSlug });
  if (!found) notFound();
  const { project, environment } = found;

  const [environments, keys, emails] = await Promise.all([
    listEnvironments({ organizationId: organization.id, projectId: project.id }),
    listEnvironmentApiKeys({ organizationId: organization.id, environmentId: environment.id }),
    listEmails({ organizationId: organization.id, environmentId: environment.id, limit: 50 }),
  ]);
  // Live keys must send from a verified domain; sandbox keys accept any address.
  const sendingDomain =
    environment.mode === "live"
      ? (await listDomains({ organizationId: organization.id })).find((d) => d.canSend)?.name
      : "example.com";

  const projectPath = `/${organization.slug}/projects/${project.slug}`;
  const target = {
    orgSlug: organization.slug,
    projectSlug: project.slug,
    envSlug: environment.slug,
  };
  const canCreateKey = can({ apiKey: ["create"] });
  const canRevokeKey = can({ apiKey: ["delete"] });
  const createRestriction =
    environment.mode === "live" ? await liveKeyRestriction(session, organization.id) : null;
  const apiUrl = env.API_PUBLIC_URL;
  const from = `onboarding@${sendingDomain ?? "your-verified-domain.com"}`;
  const curl = quickStartCurl(apiUrl, from);
  const sdkCommand = `COSS_API_KEY=${API_KEY_PREFIX[environment.mode]}… COSS_BASE_URL=${apiUrl} COSS_FROM=${from} bun packages/sdk/examples/send-email.ts`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          className="text-muted-foreground text-sm hover:text-foreground"
          href={`/${organization.slug}`}
        >
          ← Projects
        </Link>
        <PageHeader
          actions={environments.map((item) => (
            <Button
              key={item.id}
              render={<Link href={`${projectPath}/${item.slug}`} />}
              size="sm"
              variant={item.id === environment.id ? "default" : "outline"}
            >
              {item.name}
            </Button>
          ))}
          description={
            environment.mode === "live"
              ? "Production: emails are delivered through the live provider."
              : "Development: emails are recorded but never delivered."
          }
          title={
            <span className="flex items-center gap-2">
              {project.name} · {environment.name} <ModeBadge mode={environment.mode} />
            </span>
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API keys</CardTitle>
          <CardDescription>
            Keys start with <code>{API_KEY_PREFIX[environment.mode]}</code> and only work in this
            environment.
          </CardDescription>
          {canCreateKey && !createRestriction ? (
            <CardAction>
              <CreateApiKeyDialog environmentName={environment.name} {...target} />
            </CardAction>
          ) : null}
        </CardHeader>
        <CardPanel className="flex flex-col gap-3 p-2">
          {canCreateKey && createRestriction ? (
            <div className="px-2">
              <CreateApiKeyUnavailable reason={createRestriction} />
            </div>
          ) : null}
          {keys.length === 0 ? (
            <p className="p-4 text-muted-foreground text-sm">No API keys yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last used</TableHead>
                  {canRevokeKey ? <TableHead className="text-right">Actions</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name ?? "Untitled"}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {key.start ? `${key.start}…` : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(key.createdAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {key.lastRequest ? formatDateTime(key.lastRequest) : "Never"}
                    </TableCell>
                    {canRevokeKey ? (
                      <TableCell className="text-right">
                        <RevokeApiKeyButton
                          keyId={key.id}
                          keyName={key.name ?? "Untitled"}
                          {...target}
                        />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent emails</CardTitle>
          <CardDescription>The latest 50 emails sent with this environment's keys.</CardDescription>
        </CardHeader>
        <CardPanel className="p-2">
          {emails.length === 0 ? (
            <p className="p-4 text-muted-foreground text-sm">
              No emails yet. Send one with the quick start below.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Engagement</TableHead>
                  <TableHead>Mode</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emails.map((email) => (
                  <TableRow key={email.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(email.created_at)}
                    </TableCell>
                    <TableCell className="max-w-56 truncate">{email.to.join(", ")}</TableCell>
                    <TableCell className="max-w-72 truncate">
                      <Link
                        className="font-medium underline-offset-4 hover:underline"
                        href={`${projectPath}/${environment.slug}/emails/${email.id}`}
                      >
                        {email.subject}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <EmailStatusBadge status={email.status} />
                        {email.status === "scheduled" && email.scheduled_at ? (
                          <span className="whitespace-nowrap text-muted-foreground text-xs">
                            {formatDateTime(email.scheduled_at)}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {engagement(email)}
                    </TableCell>
                    <TableCell>
                      <SandboxBadge sandbox={email.sandbox} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhooks</CardTitle>
          <CardDescription>
            Get a signed request when emails from this environment are delivered, delayed, bounce,
            receive complaints, or are opened and clicked.
          </CardDescription>
          <CardAction>
            <Button
              render={<Link href={`${projectPath}/${environment.slug}/webhooks`} />}
              size="sm"
              variant="outline"
            >
              Manage webhooks
            </Button>
          </CardAction>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Open &amp; click tracking</CardTitle>
          <CardDescription>
            Record when emails are opened and links are clicked: off by default, configurable for
            the whole environment, per category, or per send.
          </CardDescription>
          <CardAction>
            <Button
              render={<Link href={`${projectPath}/${environment.slug}/tracking`} />}
              size="sm"
              variant="outline"
            >
              Tracking settings
            </Button>
          </CardAction>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suppressions</CardTitle>
          <CardDescription>
            Addresses emails from this environment skip: added automatically after permanent bounces
            and complaints, or by you (for every email or one category).
          </CardDescription>
          <CardAction>
            <Button
              render={<Link href={`${projectPath}/${environment.slug}/suppressions`} />}
              size="sm"
              variant="outline"
            >
              Manage suppressions
            </Button>
          </CardAction>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick start</CardTitle>
          <CardDescription>
            Send an email with the public API. Set <code>COSS_API_KEY</code> to a key from this
            environment.
            {environment.mode === "live" ? (
              <>
                {" "}
                Live keys send from a{" "}
                <Link className="underline" href={`/${organization.slug}/domains`}>
                  verified domain
                </Link>
                {sendingDomain ? "" : " (none yet)"}.
              </>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardPanel className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm">curl</span>
              <CopyButton value={curl} />
            </div>
            <pre className="overflow-x-auto rounded-lg border bg-muted px-3 py-2 text-xs">
              {curl}
            </pre>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-medium text-sm">SDK example (from the repository root)</span>
            <pre className="overflow-x-auto rounded-lg border bg-muted px-3 py-2 text-xs">
              {sdkCommand}
            </pre>
          </div>
        </CardPanel>
      </Card>
    </div>
  );
}
