import { listOrgAuditActions, listOrgAuditEvents } from "@coss/logs";
import type { OrgAuditEventOutput } from "@coss/logs/schemas";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import { DownloadIcon, HistoryIcon, XIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CursorPager } from "@/components/cursor-pager";
import { EmptyState } from "@/components/empty-state";
import { FilterLinks } from "@/components/filter-links";
import { Panel, PanelBody } from "@/components/panel";
import { SectionHeader } from "@/components/section-header";
import { formatDateTime } from "@/lib/format";
import { auditFiltersFrom, auditLabels, requireAuditAccess } from "./audit-data";

export const metadata: Metadata = { title: "Audit log" };

const PAGE_SIZE = 50;

/** `api_key.created` → `API key created`. */
function describeAction(action: string): string {
  const [resource = action, verb = ""] = action.split(".");
  const noun = resource
    .replaceAll("_", " ")
    .replace(/^api key/, "API key")
    .replace(/^sso/, "SSO");
  return `${noun.charAt(0).toUpperCase()}${noun.slice(1)} ${verb.replaceAll("_", " ")}`.trim();
}

/** The `field: from → to` changes an event's metadata describes, plus other details. */
function details(event: OrgAuditEventOutput): string {
  return Object.entries(event.metadata)
    .filter(([key]) => key !== "request_id" && key !== "impersonated_by")
    .map(([key, value]) => {
      if (value && typeof value === "object" && "from" in value && "to" in value) {
        return `${key}: ${String(value.from)} → ${String(value.to)}`;
      }
      return `${key}: ${Array.isArray(value) ? value.join(", ") || "all" : String(value)}`;
    })
    .join(" · ");
}

export default async function AuditLogPage({
  params,
  searchParams,
}: PageProps<"/[orgSlug]/settings/audit">) {
  const { orgSlug } = await params;
  const search = await searchParams;
  const { organization, planAllows } = await requireAuditAccess(orgSlug);
  if (!planAllows) return <AuditLogUpsell orgSlug={organization.slug} />;
  const filters = auditFiltersFrom(search);
  const before = typeof search.before === "string" ? search.before : undefined;
  const [{ events, nextBefore }, actions] = await Promise.all([
    listOrgAuditEvents({ organizationId: organization.id, filters, before, limit: PAGE_SIZE }),
    listOrgAuditActions(organization.id),
  ]);
  const { environmentNames, keyNames } = await auditLabels(
    organization.id,
    events.flatMap((event) =>
      event.actor_type === "api_key" && event.actor_id ? [event.actor_id] : [],
    ),
  );

  const path = `/${organization.slug}/settings/audit`;
  const action = filters.actions?.[0];
  const actor = filters.actorId;
  const query = (extra: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ action, actor, ...extra })) {
      if (value) params.set(key, value);
    }
    const text = params.toString();
    return text ? `${path}?${text}` : path;
  };
  const resources = [...new Set(actions.map((name) => `${name.split(".")[0]}.`))];

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        actions={
          <Button
            render={<a download href={query({}).replace(path, `${path}/export`)} />}
            size="sm"
            variant="outline"
          >
            <DownloadIcon />
            Export CSV
          </Button>
        }
        description="Who changed what in this organization: members in the dashboard, API keys, and COSS support. Newest first; entries can't be edited or deleted."
        title="Audit log"
      />

      {resources.length > 0 || actor ? (
        <div className="flex flex-wrap items-center gap-2">
          <FilterLinks
            options={[
              { value: "", label: "Everything", href: query({ action: undefined }) },
              ...resources.map((resource) => ({
                value: resource,
                label: describeAction(resource.slice(0, -1)),
                href: query({ action: resource }),
              })),
            ]}
            value={action ?? ""}
          />
          {actor ? (
            <Button
              render={<Link href={query({ actor: undefined })} />}
              size="sm"
              variant="outline"
            >
              Any actor
              <XIcon />
            </Button>
          ) : null}
        </div>
      ) : null}

      <Panel
        footer={
          before || nextBefore ? (
            <CursorPager
              newestHref={before ? query({}) : undefined}
              olderHref={nextBefore ? query({ before: nextBefore }) : undefined}
              summary={`${events.length} ${events.length === 1 ? "event" : "events"}`}
            />
          ) : null
        }
      >
        {events.length === 0 ? (
          <PanelBody flush>
            <EmptyState
              compact
              description={
                action || actor || before
                  ? "No event matches these filters."
                  : "Changes to API keys, members, domains, webhooks and settings show up here."
              }
              icon={HistoryIcon}
              title={action || actor || before ? "No matching events" : "Nothing recorded yet"}
            />
          </PanelBody>
        ) : (
          <Table variant="card">
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Where</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => {
                const actorLabel =
                  event.actor_type === "api_key" && event.actor_id
                    ? `API key ${keyNames[event.actor_id] ?? event.actor_id}`
                    : event.actor_label;
                const detail = details(event);
                return (
                  <TableRow key={event.id}>
                    <TableCell className="whitespace-nowrap align-top text-muted-foreground">
                      {formatDateTime(event.created_at)}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-col gap-0.5">
                        {event.actor_id ? (
                          <Link
                            className="hover:underline"
                            href={query({ actor: event.actor_id, before: undefined })}
                          >
                            {actorLabel}
                          </Link>
                        ) : (
                          <span className="flex items-center gap-2">
                            {actorLabel}
                            <Badge variant="info">COSS</Badge>
                          </span>
                        )}
                        {event.metadata.impersonated_by ? (
                          <span className="text-muted-foreground text-xs">
                            while impersonated by COSS support
                          </span>
                        ) : null}
                        {event.client_ip ? (
                          <span className="font-mono text-muted-foreground text-xs">
                            {event.client_ip}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{describeAction(event.action)}</span>
                        <code className="text-muted-foreground text-xs">{event.action}</code>
                        {detail ? (
                          <span className="max-w-80 whitespace-normal text-muted-foreground text-xs">
                            {detail}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-64 align-top">
                      {event.target_label || event.target_id ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="truncate">{event.target_label ?? event.target_id}</span>
                          {event.target_label && event.target_id ? (
                            <code className="truncate text-muted-foreground text-xs">
                              {event.target_id}
                            </code>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      {event.environment_id
                        ? (environmentNames[event.environment_id] ?? event.environment_id)
                        : "Organization"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Panel>
    </div>
  );
}

/** Plans without the audit log: it keeps recording, so upgrading shows the history too. */
function AuditLogUpsell(props: { orgSlug: string }) {
  return (
    <Panel>
      <PanelBody flush>
        <EmptyState
          action={
            <Button render={<Link href={`/${props.orgSlug}/settings/billing/plans`} />} size="sm">
              Compare plans
            </Button>
          }
          description="See who changed API keys, members, domains, webhooks and settings, from the dashboard or the API. Changes are already being recorded: upgrade to see them."
          icon={HistoryIcon}
          title="The audit log is part of the Pro plan"
        />
      </PanelBody>
    </Panel>
  );
}
