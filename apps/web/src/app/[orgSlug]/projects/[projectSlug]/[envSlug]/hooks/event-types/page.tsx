import { pageHookEventTypes } from "@coss/hooks";
import { Badge } from "@coss/ui/components/badge";
import { Card, CardPanel } from "@coss/ui/components/card";
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
import { PageHeader } from "@/components/page-header";
import { ArchiveEventTypeButton, CreateEventTypeDialog } from "../hook-actions";
import { hookPageContext } from "../page-context";

export const metadata: Metadata = { title: "Hooks event types" };

export default async function HookEventTypesPage({
  params,
}: PageProps<"/[orgSlug]/projects/[projectSlug]/[envSlug]/hooks/event-types">) {
  const { can, organization, environment, hooksPath, target } = await hookPageContext(await params);
  const { eventTypes } = await pageHookEventTypes({
    organizationId: organization.id,
    environmentId: environment.id,
    includeArchived: true,
    limit: 100,
  });
  const canArchive = can({ hook: ["delete"] });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link className="text-muted-foreground text-sm hover:text-foreground" href={hooksPath}>
          ← Hooks
        </Link>
        <PageHeader
          actions={can({ hook: ["create"] }) ? <CreateEventTypeDialog {...target} /> : null}
          description="The kinds of messages you send. Your applications' users pick the ones their endpoints receive."
          title="Event types"
        />
      </div>
      <Card>
        <CardPanel className="p-2">
          {eventTypes.length === 0 ? (
            <p className="p-4 text-muted-foreground text-sm">
              No event types yet. Messages can use any type, but registered ones are what users
              subscribe to.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  {canArchive ? <TableHead className="text-right">Actions</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventTypes.map((eventType) => (
                  <TableRow key={eventType.id}>
                    <TableCell>
                      <span className="font-mono text-xs">{eventType.name}</span>{" "}
                      {eventType.archivedAt ? <Badge variant="secondary">Archived</Badge> : null}
                    </TableCell>
                    <TableCell className="whitespace-normal text-sm">
                      {eventType.description ?? "—"}
                    </TableCell>
                    {canArchive ? (
                      <TableCell className="text-right">
                        <ArchiveEventTypeButton
                          {...target}
                          archived={eventType.archivedAt !== null}
                          name={eventType.name}
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
    </div>
  );
}
