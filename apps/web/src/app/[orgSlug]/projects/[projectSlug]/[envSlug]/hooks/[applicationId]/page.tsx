import {
  findHookApplication,
  listHookEndpoints,
  listHookEventTypes,
  pageHookMessages,
} from "@coss/hooks";
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
import { PageHeader } from "@/components/page-header";
import { formatDateTime } from "@/lib/format";
import { EndpointStatusBadge } from "../../webhooks/endpoint-status";
import { CreateEndpointDialog, DeleteApplicationButton, OpenPortalButton } from "../hook-actions";
import { hookPageContext } from "../page-context";

export const metadata: Metadata = { title: "Hooks application" };

export default async function HookApplicationPage({
  params,
}: PageProps<"/[orgSlug]/projects/[projectSlug]/[envSlug]/hooks/[applicationId]">) {
  const { applicationId, ...envParams } = await params;
  const { can, organization, environment, hooksPath, target } = await hookPageContext(envParams);
  const application = await findHookApplication({
    organizationId: organization.id,
    environmentId: environment.id,
    ref: applicationId,
  });
  if (!application) notFound();
  const scope = { organizationId: organization.id, applicationId: application.id };
  const [endpoints, eventTypes, messages] = await Promise.all([
    listHookEndpoints(scope),
    listHookEventTypes({ organizationId: organization.id, environmentId: environment.id }),
    pageHookMessages({ ...scope, limit: 20 }),
  ]);
  const appTarget = { ...target, applicationId: application.id };
  const appPath = `${hooksPath}/${application.id}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link className="text-muted-foreground text-sm hover:text-foreground" href={hooksPath}>
          ← Hooks
        </Link>
        <PageHeader
          actions={
            <>
              {can({ hook: ["update"] }) ? <OpenPortalButton {...appTarget} /> : null}
              {can({ hook: ["delete"] }) ? (
                <DeleteApplicationButton {...appTarget} name={application.name} />
              ) : null}
            </>
          }
          description={
            <span className="font-mono text-xs">
              {application.id}
              {application.uid ? ` · uid ${application.uid}` : ""}
            </span>
          }
          title={application.name}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Endpoints</CardTitle>
          <CardDescription>
            Where this application's messages go. Its users can manage them in the portal.
          </CardDescription>
          {can({ hook: ["create"] }) ? (
            <CardAction>
              <CreateEndpointDialog
                {...appTarget}
                eventTypes={eventTypes.map((type) => type.name)}
              />
            </CardAction>
          ) : null}
        </CardHeader>
        <CardPanel className="p-2">
          {endpoints.length === 0 ? (
            <p className="p-4 text-muted-foreground text-sm">No endpoints yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Event types</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {endpoints.map((endpoint) => (
                  <TableRow key={endpoint.id}>
                    <TableCell className="max-w-96">
                      <Link
                        className="break-all font-medium hover:underline"
                        href={`${appPath}/endpoints/${endpoint.id}`}
                      >
                        {endpoint.url}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-normal font-mono text-xs">
                      {endpoint.filterTypes.length === 0 ? "All" : endpoint.filterTypes.join(", ")}
                    </TableCell>
                    <TableCell>
                      <EndpointStatusBadge endpoint={endpoint} />
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
          <CardTitle>Recent messages</CardTitle>
          <CardDescription>The last 20 messages sent to this application.</CardDescription>
        </CardHeader>
        <CardPanel className="p-2">
          {messages.messages.length === 0 ? (
            <p className="p-4 text-muted-foreground text-sm">No messages yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event type</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.messages.map((message) => (
                  <TableRow key={message.id}>
                    <TableCell className="font-mono text-xs">{message.eventType}</TableCell>
                    <TableCell>
                      <Link
                        className="font-mono text-xs hover:underline"
                        href={`${appPath}/messages/${message.id}`}
                      >
                        {message.id}
                      </Link>
                    </TableCell>
                    <TableCell>{formatDateTime(message.createdAt)}</TableCell>
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
