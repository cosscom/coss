import {
  findHookApplication,
  getHookEndpoint,
  latestHookEndpointRecovery,
  listHookEventTypes,
  pageHookDeliveries,
  previousSecretExpiresAt,
} from "@coss/hooks";
import { formatRetentionDays, RETENTION_DAYS } from "@coss/retention";
import { Alert, AlertDescription, AlertTitle } from "@coss/ui/components/alert";
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
import { DISABLE_FAILING_ENDPOINT_AFTER_MS } from "@coss/webhooks";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { formatDateTime } from "@/lib/format";
import { EndpointStatusBadge } from "../../../../webhooks/endpoint-status";
import {
  DeleteEndpointButton,
  RecoverButton,
  RetryDeliveryButton,
  RevealSecret,
  RollSecretButton,
  SendTestButton,
  ToggleEndpointButton,
} from "../../../hook-actions";
import { DELIVERY_STATUS, hookPageContext } from "../../../page-context";

export const metadata: Metadata = { title: "Hooks endpoint" };

const DISABLED_AFTER_DAYS = DISABLE_FAILING_ENDPOINT_AFTER_MS / (24 * 3_600_000);

export default async function HookEndpointPage({
  params,
}: PageProps<"/[orgSlug]/projects/[projectSlug]/[envSlug]/hooks/[applicationId]/endpoints/[endpointId]">) {
  const { applicationId, endpointId, ...envParams } = await params;
  const { can, organization, environment, hooksPath, target } = await hookPageContext(envParams);
  const application = await findHookApplication({
    organizationId: organization.id,
    environmentId: environment.id,
    ref: applicationId,
  });
  if (!application) notFound();
  const endpoint = await getHookEndpoint({
    organizationId: organization.id,
    applicationId: application.id,
    id: endpointId,
  });
  if (!endpoint) notFound();
  const [deliveries, eventTypes, recovery] = await Promise.all([
    pageHookDeliveries({
      organizationId: organization.id,
      applicationId: application.id,
      endpointId: endpoint.id,
      limit: 50,
    }),
    listHookEventTypes({ organizationId: organization.id, environmentId: environment.id }),
    latestHookEndpointRecovery({ organizationId: organization.id, endpointId: endpoint.id }),
  ]);
  const appPath = `${hooksPath}/${application.id}`;
  const endpointTarget = { ...target, applicationId: application.id, endpointId: endpoint.id };
  const canUpdate = can({ hook: ["update"] });
  const previousExpiresAt = previousSecretExpiresAt(endpoint);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link className="text-muted-foreground text-sm hover:text-foreground" href={appPath}>
          ← {application.name}
        </Link>
        <PageHeader
          actions={
            <>
              {canUpdate && endpoint.enabled ? <RecoverButton {...endpointTarget} /> : null}
              {canUpdate ? (
                <ToggleEndpointButton {...endpointTarget} enabled={endpoint.enabled} />
              ) : null}
              {can({ hook: ["delete"] }) ? (
                <DeleteEndpointButton {...endpointTarget} url={endpoint.url} />
              ) : null}
            </>
          }
          description={endpoint.description ?? undefined}
          title={<span className="break-all">{endpoint.url}</span>}
        />
      </div>

      {!endpoint.enabled && endpoint.disabledReason === "failing" ? (
        <Alert variant="error">
          <AlertTitle>Disabled after repeated failures</AlertTitle>
          <AlertDescription>
            Every delivery to this endpoint failed for {DISABLED_AFTER_DAYS} days, so COSS disabled
            it{endpoint.disabledAt ? ` on ${formatDateTime(endpoint.disabledAt)}` : ""}. Enable it
            again once its receiver works, then recover what it missed.
          </AlertDescription>
        </Alert>
      ) : null}
      {endpoint.enabled && endpoint.failingSince ? (
        <Alert variant="warning">
          <AlertTitle>Failing since {formatDateTime(endpoint.failingSince)}</AlertTitle>
          <AlertDescription>
            If no delivery succeeds for {DISABLED_AFTER_DAYS} days, COSS disables the endpoint.
          </AlertDescription>
        </Alert>
      ) : null}
      {recovery ? (
        <p className="text-muted-foreground text-sm">
          Last recovery ({formatDateTime(recovery.createdAt)}): {recovery.requeued} deliveries
          requeued{recovery.status === "pending" ? ", still running" : ""}.
        </p>
      ) : null}

      <Card>
        <CardPanel className="p-2">
          <Table>
            <TableBody>
              <TableRow>
                <TableHead className="w-40">Status</TableHead>
                <TableCell>
                  <EndpointStatusBadge endpoint={endpoint} />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Event types</TableHead>
                <TableCell className="whitespace-normal font-mono text-xs">
                  {endpoint.filterTypes.length === 0 ? "All" : endpoint.filterTypes.join(", ")}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Rate limit</TableHead>
                <TableCell>
                  {endpoint.rateLimitPerSecond ? `${endpoint.rateLimitPerSecond}/s` : "Default"}
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
              <code>webhook-signature</code> headers (Standard Webhooks), signed with this secret.
            </CardDescription>
          </CardHeader>
          <CardPanel className="flex flex-col gap-4">
            {previousExpiresAt ? (
              <p className="text-sm">
                The previous secret also signs requests until{" "}
                <span className="font-medium">{formatDateTime(previousExpiresAt)}</span>.
              </p>
            ) : null}
            <div className="flex flex-wrap items-start gap-2">
              <RevealSecret {...endpointTarget} key={endpoint.updatedAt.toISOString()} />
              <RollSecretButton {...endpointTarget} />
            </div>
          </CardPanel>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Recent deliveries</CardTitle>
          <CardDescription>
            Failed deliveries are retried for about a day (8 attempts). Kept for{" "}
            {formatRetentionDays(RETENTION_DAYS.hookMessages)}.
          </CardDescription>
        </CardHeader>
        <CardPanel className="flex flex-col gap-3 p-2">
          {can({ hook: ["send"] }) && endpoint.enabled ? (
            <div className="px-2 pt-2">
              <SendTestButton
                {...endpointTarget}
                eventTypes={eventTypes.map((type) => type.name)}
              />
            </div>
          ) : null}
          {deliveries.deliveries.length === 0 ? (
            <p className="p-4 text-muted-foreground text-sm">No deliveries yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Last result</TableHead>
                  <TableHead>Next attempt</TableHead>
                  {canUpdate ? <TableHead className="text-right">Actions</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.deliveries.map((delivery) => {
                  const [variant, label] = DELIVERY_STATUS[delivery.status];
                  return (
                    <TableRow key={delivery.id}>
                      <TableCell>
                        <Link
                          className="font-mono text-xs hover:underline"
                          href={`${appPath}/messages/${delivery.messageId}`}
                        >
                          {delivery.messageId}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={variant}>{label}</Badge>
                      </TableCell>
                      <TableCell>{delivery.attemptCount}</TableCell>
                      <TableCell className="max-w-64 whitespace-normal break-all text-xs">
                        {delivery.lastStatusCode
                          ? `HTTP ${delivery.lastStatusCode}`
                          : (delivery.lastError ?? "—")}
                      </TableCell>
                      <TableCell>{formatDateTime(delivery.nextAttemptAt)}</TableCell>
                      {canUpdate ? (
                        <TableCell className="text-right">
                          {delivery.status === "pending" ? null : (
                            <RetryDeliveryButton
                              {...target}
                              applicationId={application.id}
                              deliveryId={delivery.id}
                            />
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
