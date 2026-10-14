import {
  findHookApplication,
  getHookMessage,
  listHookAttempts,
  listMessageDeliveries,
} from "@coss/hooks";
import { Badge } from "@coss/ui/components/badge";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { formatDateTime } from "@/lib/format";
import { RetryDeliveryButton } from "../../../hook-actions";
import { DELIVERY_STATUS, hookPageContext } from "../../../page-context";

export const metadata: Metadata = { title: "Hooks message" };

export default async function HookMessagePage({
  params,
}: PageProps<"/[orgSlug]/projects/[projectSlug]/[envSlug]/hooks/[applicationId]/messages/[messageId]">) {
  const { applicationId, messageId, ...envParams } = await params;
  const { can, organization, environment, hooksPath, target } = await hookPageContext(envParams);
  const application = await findHookApplication({
    organizationId: organization.id,
    environmentId: environment.id,
    ref: applicationId,
  });
  if (!application) notFound();
  const message = await getHookMessage({
    organizationId: organization.id,
    applicationId: application.id,
    id: messageId,
  });
  if (!message) notFound();
  const deliveries = await listMessageDeliveries({ organizationId: organization.id, message });
  const attempts = await Promise.all(deliveries.map((delivery) => listHookAttempts(delivery)));
  const appPath = `${hooksPath}/${application.id}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link className="text-muted-foreground text-sm hover:text-foreground" href={appPath}>
          ← {application.name}
        </Link>
        <PageHeader
          description={`Sent ${formatDateTime(message.createdAt)}`}
          title={<span className="font-mono">{message.eventType}</span>}
        />
        <p className="font-mono text-muted-foreground text-xs">{message.id}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payload</CardTitle>
          <CardDescription>The JSON body delivered to each endpoint.</CardDescription>
        </CardHeader>
        <CardPanel>
          <pre className="max-h-96 overflow-auto rounded-lg border bg-muted p-3 font-mono text-xs">
            {JSON.stringify(message.payload, null, 2)}
          </pre>
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deliveries</CardTitle>
          <CardDescription>
            One per endpoint the message went to, with every attempt.
          </CardDescription>
        </CardHeader>
        <CardPanel className="flex flex-col gap-4">
          {deliveries.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No endpoint of this application was subscribed to {message.eventType}.
            </p>
          ) : (
            deliveries.map((delivery, index) => {
              const [variant, label] = DELIVERY_STATUS[delivery.status];
              return (
                <div className="flex flex-col gap-2 rounded-lg border p-3" key={delivery.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={variant}>{label}</Badge>
                      <Link
                        className="font-mono text-xs hover:underline"
                        href={`${appPath}/endpoints/${delivery.endpointId}`}
                      >
                        {delivery.endpointId}
                      </Link>
                    </div>
                    {can({ hook: ["update"] }) && delivery.status !== "pending" ? (
                      <RetryDeliveryButton
                        {...target}
                        applicationId={application.id}
                        deliveryId={delivery.id}
                      />
                    ) : null}
                  </div>
                  {delivery.lastError && (attempts[index] ?? []).length === 0 ? (
                    <p className="text-muted-foreground text-xs">{delivery.lastError}</p>
                  ) : null}
                  <ul className="flex flex-col gap-1 text-xs">
                    {(attempts[index] ?? []).map((attempt) => (
                      <li className="flex flex-col gap-0.5" key={attempt.id}>
                        <span>
                          {formatDateTime(attempt.attemptedAt)} ·{" "}
                          {attempt.statusCode ? `HTTP ${attempt.statusCode}` : attempt.error} ·{" "}
                          {attempt.durationMs} ms
                        </span>
                        {attempt.responseExcerpt ? (
                          <code className="break-all text-muted-foreground">
                            {attempt.responseExcerpt}
                          </code>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </CardPanel>
      </Card>
    </div>
  );
}
