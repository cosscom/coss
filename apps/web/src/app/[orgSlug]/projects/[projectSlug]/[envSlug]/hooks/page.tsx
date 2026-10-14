import { pageHookApplications, searchHookApplications } from "@coss/hooks";
import { Button } from "@coss/ui/components/button";
import { Card, CardPanel } from "@coss/ui/components/card";
import { Input } from "@coss/ui/components/input";
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
import { ModeBadge } from "@/components/email-badges";
import { PageHeader } from "@/components/page-header";
import { formatDateTime } from "@/lib/format";
import { CreateApplicationDialog } from "./hook-actions";
import { hookPageContext } from "./page-context";

export const metadata: Metadata = { title: "Hooks" };

export default async function HooksPage({
  params,
  searchParams,
}: PageProps<"/[orgSlug]/projects/[projectSlug]/[envSlug]/hooks">) {
  const { can, project, environment, envPath, hooksPath, organization, target } =
    await hookPageContext(await params);
  const { q, after } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const base = { organizationId: organization.id, environmentId: environment.id };
  const page = query
    ? { applications: await searchHookApplications({ ...base, query }), hasMore: false }
    : await pageHookApplications({ ...base, after: typeof after === "string" ? after : undefined });
  const last = page.applications.at(-1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link className="text-muted-foreground text-sm hover:text-foreground" href={envPath}>
          ← {project.name} · {environment.name}
        </Link>
        <PageHeader
          actions={
            <>
              <Button
                render={<Link href={`${hooksPath}/event-types`} />}
                size="sm"
                variant="outline"
              >
                Event types
              </Button>
              <Button render={<Link href={`${hooksPath}/settings`} />} size="sm" variant="outline">
                Portal settings
              </Button>
              {can({ hook: ["create"] }) ? <CreateApplicationDialog {...target} /> : null}
            </>
          }
          description="Send a message to one of your applications once: COSS delivers it, signed and retried, to every endpoint its users registered."
          title={
            <span className="flex items-center gap-2">
              Hooks <ModeBadge mode={environment.mode} />
            </span>
          }
        />
      </div>

      <form className="flex max-w-md gap-2" method="get">
        <Input defaultValue={query} name="q" placeholder="Find by uid, name or id" />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      <Card>
        <CardPanel className="p-2">
          {page.applications.length === 0 ? (
            <p className="p-4 text-muted-foreground text-sm">
              {query
                ? "No application matches."
                : "No applications yet. Create one per customer (or user) who receives your messages, through the API or here."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Application</TableHead>
                  <TableHead>UID</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.applications.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell>
                      <Link
                        className="font-medium hover:underline"
                        href={`${hooksPath}/${application.id}`}
                      >
                        {application.name}
                      </Link>
                      <div className="font-mono text-muted-foreground text-xs">
                        {application.id}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{application.uid ?? "—"}</TableCell>
                    <TableCell>{formatDateTime(application.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardPanel>
      </Card>
      {page.hasMore && last ? (
        <div>
          <Button
            render={<Link href={`${hooksPath}?${new URLSearchParams({ after: last.id })}`} />}
            size="sm"
            variant="outline"
          >
            Older applications
          </Button>
        </div>
      ) : null}
    </div>
  );
}
