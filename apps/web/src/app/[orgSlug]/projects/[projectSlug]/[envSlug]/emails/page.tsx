import { type EmailObjectOutput, listEmailsPage } from "@coss/email";
import { formatRetentionDays, RETENTION_DAYS } from "@coss/retention";
import { getEnvironment } from "@coss/tenancy";
import { Button } from "@coss/ui/components/button";
import { MailIcon, SearchXIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listHref, stringParam } from "@/components/admin/list-controls";
import { CursorPager } from "@/components/cursor-pager";
import { ModeBadge } from "@/components/email-badges";
import { EmailTable } from "@/components/email-table";
import { EmptyState } from "@/components/empty-state";
import { FilterLinks } from "@/components/filter-links";
import { PageHeader } from "@/components/page-header";
import { Panel, PanelBody } from "@/components/panel";
import { SearchForm } from "@/components/search-form";
import { environmentPath } from "@/lib/navigation";
import { requireOrgMember } from "@/lib/session";

export const metadata: Metadata = { title: "Emails" };

const PAGE_SIZE = 50;

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
  { value: "scheduled", label: "Scheduled" },
  { value: "queued", label: "Queued" },
  { value: "canceled", label: "Canceled" },
] as const satisfies readonly { value: EmailObjectOutput["status"] | "all"; label: string }[];

type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];

function statusParam(value: string): StatusFilter {
  return STATUS_FILTERS.find((filter) => filter.value === value)?.value ?? "all";
}

export default async function EmailsPage({
  params,
  searchParams,
}: PageProps<"/[orgSlug]/projects/[projectSlug]/[envSlug]/emails">) {
  const { orgSlug, projectSlug, envSlug } = await params;
  const search = await searchParams;
  const { organization } = await requireOrgMember(orgSlug);
  const found = await getEnvironment({ organizationId: organization.id, projectSlug, envSlug });
  if (!found) notFound();
  const { project, environment } = found;

  const query = stringParam(search.q);
  const status = statusParam(stringParam(search.status));
  const before = stringParam(search.before) || undefined;
  const page = await listEmailsPage({
    organizationId: organization.id,
    environmentId: environment.id,
    limit: PAGE_SIZE,
    query: query || undefined,
    status: status === "all" ? undefined : [status],
    before,
  });

  const base = environmentPath(organization.slug, project.slug, environment.slug);
  const path = `${base}/emails`;
  const filtered = Boolean(query) || status !== "all";
  const hrefWith = (overrides: { status?: StatusFilter; before?: string }) =>
    listHref(path, {
      q: query,
      status: (overrides.status ?? status) === "all" ? undefined : (overrides.status ?? status),
      before: overrides.before,
    });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        description={`Every email sent with ${project.name} · ${environment.name}'s keys, newest first. Emails are kept for ${formatRetentionDays(RETENTION_DAYS.emails)}.`}
        meta={<ModeBadge mode={environment.mode} />}
        title="Emails"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterLinks
          options={STATUS_FILTERS.map((filter) => ({
            value: filter.value,
            label: filter.label,
            href: hrefWith({ status: filter.value }),
          }))}
          value={status}
        />
        <SearchForm
          action={path}
          keep={{ status: status === "all" ? undefined : status }}
          placeholder="Subject or recipient"
          query={query}
        />
      </div>

      <Panel
        footer={
          page.items.length > 0 || before ? (
            <CursorPager
              newestHref={before ? hrefWith({}) : undefined}
              olderHref={page.nextCursor ? hrefWith({ before: page.nextCursor }) : undefined}
              summary={`${page.items.length} ${page.items.length === 1 ? "email" : "emails"}${before ? " (older)" : ""}`}
            />
          ) : null
        }
      >
        {page.items.length === 0 ? (
          <PanelBody flush>
            {filtered ? (
              <EmptyState
                action={
                  <Button render={<Link href={path} />} size="sm" variant="outline">
                    Clear filters
                  </Button>
                }
                compact
                description="No email matches these filters."
                icon={SearchXIcon}
                title="Nothing found"
              />
            ) : (
              <EmptyState
                action={
                  <Button
                    render={<Link href={`${base}#quick-start`} />}
                    size="sm"
                    variant="outline"
                  >
                    Quick start
                  </Button>
                }
                compact
                description="Emails sent with this environment's API keys show up here."
                icon={MailIcon}
                title="No emails yet"
              />
            )}
          </PanelBody>
        ) : (
          <EmailTable base={base} emails={page.items} />
        )}
      </Panel>
    </div>
  );
}
