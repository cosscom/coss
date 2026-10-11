import { logFacets, logHistogram, queryLogs } from "@coss/logs";
import { listEnvironmentApiKeys } from "@coss/tenancy";
import type { Metadata } from "next";
import Link from "next/link";
import { ModeBadge } from "@/components/email-badges";
import { LogExplorer } from "@/components/logs/log-explorer";
import { PageHeader } from "@/components/page-header";
import { logViewFrom, requireLogsAccess } from "@/lib/logs";

export const metadata: Metadata = { title: "Logs" };

const PAGE_SIZE = 100;

export default async function LogsPage({
  params,
  searchParams,
}: PageProps<"/[orgSlug]/projects/[projectSlug]/[envSlug]/logs">) {
  const { organization, project, environment, scope } = await requireLogsAccess(await params);
  const search = await searchParams;
  const view = logViewFrom(search);
  const range = { from: view.from, to: view.to };

  const [page, histogram, facets, keys] = await Promise.all([
    queryLogs({ ...scope, ...range, filters: view.filters, limit: PAGE_SIZE }),
    logHistogram({ ...scope, ...range, filters: view.filters }),
    logFacets({ ...scope, ...range, filters: view.filters }),
    listEnvironmentApiKeys(scope),
  ]);
  const apiKeyNames = Object.fromEntries(keys.map((key) => [key.id, key.name ?? key.id]));
  const envPath = `/${organization.slug}/projects/${project.slug}/${environment.slug}`;
  const selected = typeof search.log === "string" ? search.log : null;

  return (
    // Wider than the dashboard's column: log lines need the room.
    <div className="relative left-1/2 flex w-[min(100vw-3rem,96rem)] -translate-x-1/2 flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link className="text-muted-foreground text-sm hover:text-foreground" href={envPath}>
          ← {project.name} · {environment.name}
        </Link>
        <PageHeader
          description="Every API request made with this environment's keys, every email event and every webhook delivery attempt. Kept for 30 days."
          title={
            <span className="flex items-center gap-2">
              Logs <ModeBadge mode={environment.mode} />
            </span>
          }
        />
      </div>
      <LogExplorer
        apiKeyNames={apiKeyNames}
        envPath={envPath}
        facets={facets}
        histogram={histogram}
        page={page}
        selected={selected}
        view={{
          q: view.q,
          preset: view.preset,
          from: view.from.toISOString(),
          to: view.to.toISOString(),
        }}
      />
    </div>
  );
}
