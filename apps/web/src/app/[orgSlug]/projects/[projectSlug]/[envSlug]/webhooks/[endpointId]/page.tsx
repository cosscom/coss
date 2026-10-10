import { getEnvironment } from "@coss/tenancy";
import { Badge } from "@coss/ui/components/badge";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import {
  getWebhookEndpoint,
  listWebhookDeliveries,
  type WebhookDeliveryLogEntry,
} from "@coss/webhooks";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { formatDateTime } from "@/lib/format";
import { requireOrgMember } from "@/lib/session";
import {
  DeleteEndpointButton,
  RetryDeliveryButton,
  RevealSecret,
  ToggleEndpointButton,
} from "./endpoint-actions";

export const metadata: Metadata = { title: "Webhook endpoint" };

const DELIVERY_STATUS = {
  pending: ["warning", "Pending"],
  succeeded: ["success", "Succeeded"],
  failed: ["error", "Failed"],
} as const satisfies Record<WebhookDeliveryLogEntry["status"], readonly [string, string]>;

function lastResult(delivery: WebhookDeliveryLogEntry): string {
  const last = delivery.attempts.at(-1);
  if (!last) return "Not attempted yet";
  const outcome = last.statusCode ? `HTTP ${last.statusCode}` : (last.error ?? "Failed");
  return `${outcome} in ${last.durationMs} ms`;
}

export default async function WebhookEndpointPage({
  params,
}: PageProps<"/[orgSlug]/projects/[projectSlug]/[envSlug]/webhooks/[endpointId]">) {
  const { orgSlug, projectSlug, envSlug, endpointId } = await params;
  const { organization, can } = await requireOrgMember(orgSlug);
  if (!can({ webhook: ["read"] })) notFound();
  const found = await getEnvironment({ organizationId: organization.id, projectSlug, envSlug });
  if (!found) notFound();
  const { project, environment } = found;
  const endpoint = await getWebhookEndpoint({ organizationId: organization.id, id: endpointId });
  if (!endpoint || endpoint.environmentId !== environment.id) notFound();
  const deliveries = await listWebhookDeliveries({
    organizationId: organization.id,
    endpointId: endpoint.id,
  });
  const canUpdate = can({ webhook: ["update"] });
  const canDelete = can({ webhook: ["delete"] });
  const target = {
    orgSlug: organization.slug,
    projectSlug: project.slug,
    envSlug: environment.slug,
    endpointId: endpoint.id,
  };
  const base = `/${organization.slug}/projects/${project.slug}/${environment.slug}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          className="text-muted-foreground text-sm hover:text-foreground"
          href={`${base}/webhooks`}
        >
          ← Webhooks · {project.name} · {environment.name}
        </Link>
        <PageHeader
          actions={
            <>
              {canUpdate ? <ToggleEndpointButton {...target} enabled={endpoint.enabled} /> : null}
              {canDelete ? <DeleteEndpointButton {...target} url={endpoint.url} /> : null}
            </>
          }
          description={endpoint.description ?? undefined}
          title={<span className="break-all">{endpoint.url}</span>}
        />
      </div>

      <Card>
        <CardPanel className="p-2">
          <Table>
            <TableBody>
              <TableRow>
                <TableHead className="w-32">Status</TableHead>
                <TableCell>
                  {endpoint.enabled ? (
                    <Badge variant="success">Enabled</Badge>
                  ) : (
                    <Badge variant="secondary">Disabled</Badge>
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Events</TableHead>
                <TableCell className="whitespace-normal font-mono text-xs">
                  {endpoint.eventTypes.length === 0 ? "All events" : endpoint.eventTypes.join(", ")}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableCell>{formatDateTime(endpoint.createdAt)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardPanel>
      </Card>

      {canUpdate ? (
        <Card>
          <CardHeader>
            <CardTitle>Signing secret</CardTitle>
            <CardDescription>
              Requests carry <code>webhook-id</code>, <code>webhook-timestamp</code> and{" "}
              <code>webhook-signature</code> headers (Standard Webhooks). Verify them with this
              secret before trusting a request.
            </CardDescription>
          </CardHeader>
          <CardPanel>
            <RevealSecret {...target} />
          </CardPanel>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Recent deliveries</CardTitle>
          <CardDescription>
            Failed deliveries are retried for about a day (8 attempts). Any 2xx response counts as
            delivered.
          </CardDescription>
        </CardHeader>
        <CardPanel className="p-2">
          {deliveries.length === 0 ? (
            <p className="p-4 text-muted-foreground text-sm">No deliveries yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Last result</TableHead>
                  <TableHead>Next attempt</TableHead>
                  {canUpdate ? <TableHead className="text-right">Actions</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map((delivery) => {
                  const [variant, label] = DELIVERY_STATUS[delivery.status];
                  return (
                    <TableRow key={delivery.id}>
                      <TableCell>
                        <div className="font-mono text-xs">{delivery.eventType}</div>
                        <div className="text-muted-foreground text-xs">{delivery.messageId}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={variant}>{label}</Badge>
                      </TableCell>
                      <TableCell>{delivery.attemptCount}</TableCell>
                      <TableCell className="max-w-64 whitespace-normal break-all text-xs">
                        {lastResult(delivery)}
                      </TableCell>
                      <TableCell>{formatDateTime(delivery.nextAttemptAt)}</TableCell>
                      {canUpdate ? (
                        <TableCell className="text-right">
                          {delivery.status === "pending" ? null : (
                            <RetryDeliveryButton {...target} deliveryId={delivery.id} />
                          )}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardPanel>
      </Card>
    </div>
  );
}
