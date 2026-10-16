import { listOrgAuditActions, listOrgAuditEvents } from "@coss/logs";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@coss/ui/components/table";
import { DownloadIcon, HistoryIcon, XIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CursorPager } from "@/components/cursor-pager";
import { EmptyState } from "@/components/empty-state";
import { FilterLinks } from "@/components/filter-links";
import { SettingsPage, SettingsSection, SettingsTable } from "@/components/settings";
import { auditActorLabel, auditLabels, describeAction, details } from "@/lib/audit-labels";
import { formatDateTime } from "@/lib/format";
import { auditFiltersFrom, requireAuditAccess } from "./audit-data";

export const metadata: Metadata = { title: "Audit log" };

const PAGE_SIZE = 50;

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

  const filtered = Boolean(action || actor || before);

  return (
    // A log is data, not settings: it takes the page's width.
    <SettingsPage className="max-w-none">
      <SettingsSection
        action={
          <Button
            render={<a download href={query({}).replace(path, `${path}/export`)} />}
            size="sm"
            variant="outline"
          >
            <DownloadIcon />
            Export CSV
          </Button>
        }
        description="Who changed what: members in the dashboard, API keys and coss.com support. Newest first; entries can't be edited or deleted."
      >
        {resources.length > 0 || actor ? (
          <div className="flex flex-wrap items-center gap-2 border-t px-5 py-3">
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
                variant="ghost"
              >
                Any actor
                <XIcon />
              </Button>
            ) : null}
          </div>
        ) : null}
        {events.length === 0 ? (
          <div className="border-t">
            <EmptyState
              compact
              description={
                filtered
                  ? "No event matches these filters."
                  : "Changes to API keys, members, domains, webhooks and settings show up here."
              }
              icon={HistoryIcon}
              title={filtered ? "No matching events" : "Nothing recorded yet"}
            />
          </div>
        ) : (
          <SettingsTable>
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
                const actorLabel = auditActorLabel(event, keyNames);
                const detail = details(event);
                return (
                  <TableRow key={event.id}>
                    <TableCell className="whitespace-nowrap py-3 align-top text-muted-foreground">
                      {formatDateTime(event.created_at)}
                    </TableCell>
                    <TableCell className="py-3 align-top">
                      <div className="flex flex-col gap-1">
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
                            <Badge variant="outline">coss.com</Badge>
                          </span>
                        )}
                        {event.metadata.impersonated_by ? (
                          <span className="text-muted-foreground text-xs">
                            while impersonated by coss.com support
                          </span>
                        ) : null}
                        {event.client_ip ? (
                          <span className="font-mono text-muted-foreground text-xs">
                            {event.client_ip}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 align-top">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{describeAction(event.action)}</span>
                        <code className="font-mono text-muted-foreground text-xs">
                          {event.action}
                        </code>
                        {detail ? (
                          <span className="max-w-80 whitespace-normal text-muted-foreground text-xs leading-normal">
                            {detail}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-64 py-3 align-top">
                      {event.target_label || event.target_id ? (
                        <div className="flex flex-col gap-1">
                          <span className="truncate">{event.target_label ?? event.target_id}</span>
                          {event.target_label && event.target_id ? (
                            <code className="truncate font-mono text-muted-foreground text-xs">
                              {event.target_id}
                            </code>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 align-top text-muted-foreground">
                      {event.environment_id
                        ? (environmentNames[event.environment_id] ?? event.environment_id)
                        : "Organization"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </SettingsTable>
        )}
        {before || nextBefore ? (
          <div className="border-t bg-muted/40 px-5 py-2.5">
            <CursorPager
              newestHref={before ? query({}) : undefined}
              olderHref={nextBefore ? query({ before: nextBefore }) : undefined}
              summary={`${events.length} ${events.length === 1 ? "event" : "events"}`}
            />
          </div>
        ) : null}
      </SettingsSection>
    </SettingsPage>
  );
}

/** Plans without the audit log: it keeps recording, so upgrading shows the history too. */
function AuditLogUpsell(props: { orgSlug: string }) {
  return (
    <SettingsPage>
      <SettingsSection>
        <div className="border-t">
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
        </div>
      </SettingsSection>
    </SettingsPage>
  );
}
