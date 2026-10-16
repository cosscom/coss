import { API_KEY_PREFIX } from "@coss/auth/constants";
import { emailActivity, inboundAddressFor, listDomains, listEmails } from "@coss/email";
import { formatRetentionDays, RETENTION_DAYS } from "@coss/retention";
import { getEnvironment, listEnvironmentApiKeys } from "@coss/tenancy";
import { Button } from "@coss/ui/components/button";
import { cn } from "@coss/ui/lib/utils";
import { listWebhookEndpoints } from "@coss/webhooks";
import { ArrowRightIcon, CheckIcon, MailIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type BarColumn, StackedBars } from "@/components/charts/stacked-bars";
import { CodeBlock } from "@/components/code-block";
import { CopyButton } from "@/components/copy-button";
import { CopyValue } from "@/components/copy-value";
import { ModeBadge } from "@/components/email-badges";
import { EmailTable } from "@/components/email-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Panel, PanelBody } from "@/components/panel";
import { SpecItem, SpecList } from "@/components/spec-list";
import { Stat, StatRow } from "@/components/stat-row";
import { env } from "@/env";
import { emailRuntime } from "@/lib/email-runtime";
import { formatCompact, formatPercent } from "@/lib/format";
import { environmentPath } from "@/lib/navigation";
import { requireOrgMember } from "@/lib/session";

export const metadata: Metadata = { title: "Overview" };

/** Days in the activity chart and the stat tiles. */
const CHART_DAYS = 14;

const dayLabel = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });

function quickStart(apiUrl: string, from: string): { curl: string; sdk: string } {
  return {
    curl: [
      `curl -X POST ${apiUrl}/v1/emails \\`,
      `  -H "Authorization: Bearer $COSS_API_KEY" \\`,
      `  -H "Content-Type: application/json" \\`,
      `  -d '{`,
      `    "from": "Acme <${from}>",`,
      `    "to": "delivered@example.com",`,
      `    "subject": "Hello from COSS",`,
      `    "html": "<p>It works!</p>"`,
      `  }'`,
    ].join("\n"),
    sdk: [
      `import { Coss } from "coss";`,
      ``,
      `const coss = new Coss({`,
      `  apiKey: process.env.COSS_API_KEY,`,
      `  baseUrl: "${apiUrl}",`,
      `});`,
      ``,
      `const { data, error } = await coss.email.send({`,
      `  from: "Acme <${from}>",`,
      `  to: "delivered@example.com",`,
      `  subject: "Hello from COSS",`,
      `  html: "<p>It works!</p>",`,
      `});`,
    ].join("\n"),
  };
}

export default async function EnvironmentOverviewPage({
  params,
}: PageProps<"/[orgSlug]/projects/[projectSlug]/[envSlug]">) {
  const { orgSlug, projectSlug, envSlug } = await params;
  const { organization, can } = await requireOrgMember(orgSlug);
  const found = await getEnvironment({ organizationId: organization.id, projectSlug, envSlug });
  if (!found) notFound();
  const { project, environment } = found;

  const live = environment.mode === "live";
  const scope = { organizationId: organization.id, environmentId: environment.id };
  const now = new Date();
  const inbound = emailRuntime().inbound;
  const [activity, recent, keys, endpoints, domains, inboundAddress] = await Promise.all([
    emailActivity({
      ...scope,
      since: new Date(now.getTime() - (CHART_DAYS - 1) * 86_400_000),
      now,
    }),
    listEmails({ ...scope, limit: 6 }),
    listEnvironmentApiKeys(scope),
    can({ webhook: ["read"] }) ? listWebhookEndpoints(scope) : null,
    live ? listDomains({ organizationId: organization.id }) : null,
    inbound && can({ email: ["read"] }) ? inboundAddressFor(scope, inbound.managedDomain) : null,
  ]);
  // Live keys must send from a verified domain; sandbox keys accept any address.
  const sendingDomain = domains ? domains.find((d) => d.canSend)?.name : "example.com";
  const base = environmentPath(organization.slug, project.slug, environment.slug);
  const apiUrl = env.API_PUBLIC_URL;
  const from = `onboarding@${sendingDomain ?? "your-verified-domain.com"}`;
  const samples = quickStart(apiUrl, from);
  const smtpHost = env.SMTP_PUBLIC_HOST;
  // Locally the relay listens only on its unprivileged ports (production maps 465/587 onto them).
  const smtpLocal = smtpHost === "localhost" || smtpHost === "127.0.0.1";

  const { totals } = activity;
  const attempted = totals.sent + totals.failed;
  const columns: BarColumn[] = activity.days.map((day) => ({
    label: dayLabel.format(new Date(`${day.date}T00:00:00Z`)),
    values: {
      sent: day.sent,
      failed: day.failed,
      pending: day.queued + day.scheduled,
      canceled: day.canceled,
    },
  }));

  const steps = [
    ...(live
      ? [
          {
            label: "Verify a sending domain",
            description: "Live emails are sent from your own domain.",
            done: Boolean(sendingDomain),
            href: `/${organization.slug}/domains`,
          },
        ]
      : []),
    {
      label: "Create an API key",
      description: `Keys for this environment start with ${API_KEY_PREFIX[environment.mode]}.`,
      done: keys.length > 0,
      href: `${base}/api-keys`,
    },
    {
      label: "Send your first email",
      description: "With curl or the SDK, below.",
      done: recent.length > 0,
      href: "#quick-start",
    },
    ...(endpoints
      ? [
          {
            label: "Add a webhook endpoint",
            description: "Hear about deliveries, bounces and complaints.",
            done: endpoints.length > 0,
            href: `${base}/webhooks`,
          },
        ]
      : []),
  ];
  const remaining = steps.filter((step) => !step.done).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        actions={
          <Button render={<Link href={`${base}/emails`} />} size="sm" variant="outline">
            All emails
            <ArrowRightIcon />
          </Button>
        }
        description={
          live
            ? "Production: emails are delivered through the live provider."
            : "Development: emails are recorded and run through every check, but never delivered."
        }
        meta={<ModeBadge mode={environment.mode} />}
        title={`${project.name} · ${environment.name}`}
      />

      <StatRow>
        <Stat
          detail={`last ${CHART_DAYS} days`}
          href={`${base}/emails?status=sent`}
          label="Sent"
          value={formatCompact(totals.sent)}
        />
        <Stat
          detail={
            attempted > 0 ? `${formatPercent(totals.failed / attempted)} of sends` : "no sends"
          }
          href={`${base}/emails?status=failed`}
          label="Failed"
          value={formatCompact(totals.failed)}
        />
        <Stat
          detail={
            totals.trackedOpens > 0
              ? `${formatCompact(totals.opened)} of ${formatCompact(totals.trackedOpens)} tracked`
              : "tracking off"
          }
          label="Open rate"
          value={totals.trackedOpens > 0 ? formatPercent(totals.opened / totals.trackedOpens) : "—"}
        />
        <Stat
          detail={
            totals.trackedClicks > 0
              ? `${formatCompact(totals.clicked)} of ${formatCompact(totals.trackedClicks)} tracked`
              : "tracking off"
          }
          label="Click rate"
          value={
            totals.trackedClicks > 0 ? formatPercent(totals.clicked / totals.trackedClicks) : "—"
          }
        />
      </StatRow>

      <Panel
        action={
          <span className="font-mono text-muted-foreground text-xs">
            last {CHART_DAYS} days · UTC
          </span>
        }
        title="Activity"
      >
        <PanelBody>
          <StackedBars
            columns={columns}
            label={`Emails per day over the last ${CHART_DAYS} days, by status.`}
            series={[
              { key: "sent", label: "Sent", className: "bg-foreground/72" },
              { key: "failed", label: "Failed", className: "bg-destructive" },
              { key: "pending", label: "Queued or scheduled", className: "bg-info/64" },
              { key: "canceled", label: "Canceled", className: "bg-muted-foreground/32" },
            ]}
          />
        </PanelBody>
      </Panel>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Panel
          action={
            recent.length > 0 ? (
              <Button render={<Link href={`${base}/emails`} />} size="sm" variant="ghost">
                View all
                <ArrowRightIcon />
              </Button>
            ) : null
          }
          className="lg:col-span-2"
          description={`Emails are kept for ${formatRetentionDays(RETENTION_DAYS.emails)}.`}
          title="Recent emails"
        >
          {recent.length === 0 ? (
            <PanelBody flush>
              <EmptyState
                action={
                  <Button render={<a href="#quick-start" />} size="sm" variant="outline">
                    Quick start
                  </Button>
                }
                compact
                description="Emails sent with this environment's keys show up here."
                icon={MailIcon}
                title="No emails yet"
              />
            </PanelBody>
          ) : (
            <EmailTable base={base} compact emails={recent} />
          )}
        </Panel>

        <div className="flex flex-col gap-6">
          {remaining > 0 ? (
            <Panel
              action={
                <span className="font-mono text-muted-foreground text-xs">
                  {steps.length - remaining}/{steps.length}
                </span>
              }
              title="Get started"
            >
              <PanelBody flush>
                <ol className="flex flex-col">
                  {steps.map((step, index) => (
                    <li className="border-t first:border-t-0" key={step.label}>
                      <Link
                        className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/40"
                        href={step.href}
                      >
                        <span
                          className={cn(
                            "mt-px flex size-5 shrink-0 items-center justify-center rounded-full border font-mono text-[0.6875rem]",
                            step.done
                              ? "border-transparent bg-foreground text-background"
                              : "text-muted-foreground",
                          )}
                        >
                          {step.done ? <CheckIcon className="size-3" /> : index + 1}
                        </span>
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span
                            className={cn(
                              "font-medium text-sm",
                              step.done && "text-muted-foreground line-through",
                            )}
                          >
                            {step.label}
                          </span>
                          <span className="text-muted-foreground text-xs">{step.description}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </PanelBody>
            </Panel>
          ) : null}
          <Panel title="Environment">
            <PanelBody flush>
              <SpecList>
                <SpecItem label="Mode">{live ? "Live" : "Sandbox"}</SpecItem>
                <SpecItem label="Key prefix" mono>
                  {API_KEY_PREFIX[environment.mode]}
                </SpecItem>
                <SpecItem label="API keys" mono>
                  {keys.length}
                </SpecItem>
                {endpoints ? (
                  <SpecItem label="Webhook endpoints" mono>
                    {endpoints.length}
                  </SpecItem>
                ) : null}
                {inboundAddress ? (
                  <SpecItem label="Inbound address" mono>
                    <CopyValue value={`support@${inboundAddress.domain}`} />
                  </SpecItem>
                ) : null}
                <SpecItem label="Environment ID" mono>
                  <span className="truncate">{environment.id}</span>
                </SpecItem>
              </SpecList>
            </PanelBody>
          </Panel>
        </div>
      </div>

      <Panel
        action={<CopyButton label="Copy API URL" value={apiUrl} />}
        description={
          <>
            Send an email with the public API. Set <code className="font-mono">COSS_API_KEY</code>{" "}
            to a key from this environment.
            {live ? (
              <>
                {" "}
                Live keys send from a{" "}
                <Link
                  className="underline underline-offset-4"
                  href={`/${organization.slug}/domains`}
                >
                  verified domain
                </Link>
                {sendingDomain ? "" : " (none yet)"}.
              </>
            ) : null}
          </>
        }
        id="quick-start"
        title="Quick start"
      >
        <PanelBody className="overflow-hidden" flush>
          <CodeBlock
            className="rounded-none border-0 bg-transparent"
            samples={[
              { label: "curl", code: samples.curl },
              { label: "TypeScript", code: samples.sdk },
            ]}
          />
        </PanelBody>
      </Panel>

      {smtpHost ? (
        <Panel
          description={
            <>
              For apps that send over SMTP (Supabase Auth, WordPress, Rails, Laravel, Django,
              nodemailer…). The password is an{" "}
              <Link className="underline underline-offset-4" href={`${base}/api-keys`}>
                API key
              </Link>{" "}
              of this environment; emails sent this way behave like API sends.
            </>
          }
          id="smtp"
          title="SMTP"
        >
          <PanelBody flush>
            <SpecList>
              <SpecItem label="Host" mono>
                <CopyValue value={smtpHost} />
              </SpecItem>
              <SpecItem label="Port" mono>
                {smtpLocal ? "2465 (TLS) · 2587 (STARTTLS)" : "465 (TLS) · 587 (STARTTLS)"}
              </SpecItem>
              {smtpLocal ? null : (
                <SpecItem label="Alternative ports" mono>
                  2465 (TLS) · 2587 (STARTTLS)
                </SpecItem>
              )}
              <SpecItem label="Username" mono>
                <CopyValue value="coss" />
              </SpecItem>
              <SpecItem label="Password">
                An API key starting with{" "}
                <code className="font-mono">{API_KEY_PREFIX[environment.mode]}</code>
              </SpecItem>
            </SpecList>
          </PanelBody>
        </Panel>
      ) : null}
    </div>
  );
}
