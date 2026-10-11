import { formatRetentionDays, RETENTION_DAYS } from "@coss/retention";
import { getEnvironment } from "@coss/tenancy";
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
import {
  countQueuedLogDrainLines,
  getLogDrain,
  LOG_DRAIN_MAX_ATTEMPTS,
  type LogDrainBatchLogEntry,
  pageLogDrainBatches,
} from "@coss/webhooks";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { formatDateTime } from "@/lib/format";
import { requireOrgMember } from "@/lib/session";
import { DrainStatusBadge } from "../drain-status";
import { sourcesSummary } from "../sources";
import {
  DeleteDrainButton,
  EditSourcesButton,
  RevealDrainSecret,
  ToggleDrainButton,
} from "./drain-actions";

export const metadata: Metadata = { title: "Log drain" };

const BATCH_STATUS = {
  pending: ["warning", "Pending"],
  succeeded: ["success", "Sent"],
  failed: ["error", "Failed"],
} as const satisfies Record<LogDrainBatchLogEntry["status"], readonly [string, string]>;

function lastResult(batch: LogDrainBatchLogEntry): string {
  const last = batch.attempts.at(-1);
  if (!last) return batch.lastError ?? "Not attempted yet";
  const outcome = last.statusCode ? `HTTP ${last.statusCode}` : (last.error ?? "Failed");
  return `${outcome} in ${last.durationMs} ms`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function LogDrainPage({
  params,
}: PageProps<"/[orgSlug]/projects/[projectSlug]/[envSlug]/log-drains/[drainId]">) {
  const { orgSlug, projectSlug, envSlug, drainId } = await params;
  const { organization, can } = await requireOrgMember(orgSlug);
  if (!can({ logDrain: ["read"] })) notFound();
  const found = await getEnvironment({ organizationId: organization.id, projectSlug, envSlug });
  if (!found) notFound();
  const { project, environment } = found;
  const drain = await getLogDrain({ organizationId: organization.id, id: drainId });
  if (!drain || drain.environmentId !== environment.id) notFound();
  const ids = { organizationId: organization.id, drainId: drain.id };
  const [{ batches }, queued] = await Promise.all([
    pageLogDrainBatches({ ...ids, limit: 50 }),
    countQueuedLogDrainLines(ids),
  ]);
  const canUpdate = can({ logDrain: ["update"] });
  const target = {
    orgSlug: organization.slug,
    projectSlug: project.slug,
    envSlug: environment.slug,
    drainId: drain.id,
  };
  const base = `/${organization.slug}/projects/${project.slug}/${environment.slug}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          className="text-muted-foreground text-sm hover:text-foreground"
          href={`${base}/log-drains`}
        >
          ← Log drains · {project.name} · {environment.name}
        </Link>
        <PageHeader
          actions={
            <>
              {canUpdate ? <EditSourcesButton {...target} sources={drain.sources} /> : null}
              {canUpdate ? <ToggleDrainButton {...target} enabled={drain.enabled} /> : null}
              {can({ logDrain: ["delete"] }) ? (
                <DeleteDrainButton {...target} url={drain.url} />
              ) : null}
            </>
          }
          description={drain.description ?? undefined}
          title={<span className="break-all">{drain.url}</span>}
        />
      </div>

      {!drain.enabled && drain.disabledReason === "failing" ? (
        <Alert variant="error">
          <AlertTitle>Disabled after repeated failures</AlertTitle>
          <AlertDescription>
            A batch failed all {LOG_DRAIN_MAX_ATTEMPTS} attempts, so COSS disabled this drain
            {drain.disabledAt ? ` on ${formatDateTime(drain.disabledAt)}` : ""} and dropped the
            lines waiting for it. Fix the endpoint, then enable the drain again.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardPanel className="p-2">
          <Table>
            <TableBody>
              <TableRow>
                <TableHead className="w-32">Status</TableHead>
                <TableCell>
                  <DrainStatusBadge drain={drain} />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Sources</TableHead>
                <TableCell className="whitespace-normal">{sourcesSummary(drain.sources)}</TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Waiting</TableHead>
                <TableCell>
                  {queued === 1 ? "1 line" : `${queued.toLocaleString("en-US")} lines`}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableCell>{formatDateTime(drain.createdAt)}</TableCell>
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
              Requests carry <code>webhook-id</code> (the batch id), <code>webhook-timestamp</code>{" "}
              and <code>webhook-signature</code> headers (Standard Webhooks). Verify them with this
              secret before storing the lines.
            </CardDescription>
          </CardHeader>
          <CardPanel>
            <RevealDrainSecret {...target} />
          </CardPanel>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Recent batches</CardTitle>
          <CardDescription>
            Each batch is one NDJSON request of up to 500 lines. Failed batches are retried for
            about a day ({LOG_DRAIN_MAX_ATTEMPTS} attempts); any 2xx response counts as sent.
            Batches are kept for {formatRetentionDays(RETENTION_DAYS.logDrainBatches)}.
          </CardDescription>
        </CardHeader>
        <CardPanel className="p-2">
          {batches.length === 0 ? (
            <p className="p-4 text-muted-foreground text-sm">No batches yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Lines</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Last result</TableHead>
                  <TableHead>Next attempt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => {
                  const [variant, label] = BATCH_STATUS[batch.status];
                  const excerpt = batch.attempts.at(-1)?.responseExcerpt;
                  return (
                    <TableRow key={batch.id}>
                      <TableCell>
                        <div className="text-xs">{formatDateTime(batch.createdAt)}</div>
                        <div className="font-mono text-muted-foreground text-xs">{batch.id}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={variant}>{label}</Badge>
                      </TableCell>
                      <TableCell>
                        {batch.recordCount}
                        <div className="text-muted-foreground text-xs">
                          {formatBytes(batch.byteSize)}
                        </div>
                      </TableCell>
                      <TableCell>{batch.attemptCount}</TableCell>
                      <TableCell className="max-w-64 whitespace-normal break-all text-xs">
                        {lastResult(batch)}
                        {excerpt && batch.status !== "succeeded" ? (
                          <div className="mt-1 line-clamp-2 font-mono text-muted-foreground">
                            {excerpt}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>{formatDateTime(batch.nextAttemptAt)}</TableCell>
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
