import type { ReputationEventWithActor, ReputationStandingRow } from "@coss/reputation";
import { metricsSnapshot } from "@coss/reputation";
import { Alert, AlertDescription, AlertTitle } from "@coss/ui/components/alert";
import { Badge } from "@coss/ui/components/badge";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
import { Meter, MeterIndicator, MeterTrack } from "@coss/ui/components/meter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import Link from "next/link";
import { formatDateTime } from "@/lib/format";

const TRIGGER_LABELS: Record<string, string> = {
  bounce_rate: "Bounce rate",
  complaint_rate: "Complaint rate",
  manual: "COSS review",
  policy: "Policy",
  evaluation: "Evaluation",
};

export function triggerLabel(trigger: string | null): string {
  if (!trigger) return "—";
  return TRIGGER_LABELS[trigger] ?? trigger;
}

export function formatRate(rate: number | null): string {
  return rate === null ? "—" : `${(rate * 100).toFixed(2)}%`;
}

export function StandingBadge({ status }: { status: ReputationStandingRow["status"] | null }) {
  if (status === "suspended") return <Badge variant="error">suspended</Badge>;
  if (status === "warning") return <Badge variant="warning">warning</Badge>;
  return <Badge variant="success">good</Badge>;
}

/** Org-wide banner (layout) while the organization is warned or suspended. */
export function ReputationBanner(props: {
  standing: Pick<ReputationStandingRow, "status" | "reason">;
  href: string;
}) {
  const { status, reason } = props.standing;
  if (status === "good") return null;
  const suspended = status === "suspended";
  return (
    <div className="mx-auto w-full max-w-5xl px-6 pt-6">
      <Alert variant={suspended ? "error" : "warning"}>
        <AlertTitle>
          {suspended ? "Live sending is suspended" : "Your sending reputation needs attention"}
        </AlertTitle>
        <AlertDescription>
          {suspended
            ? `COSS suspended live sending for this organization (${triggerLabel(reason).toLowerCase()}). Sandbox keys still work. Contact support to resume sending.`
            : `${triggerLabel(reason)} is approaching the level at which COSS suspends live sending automatically.`}{" "}
          <Link className="underline" href={props.href}>
            View reputation
          </Link>
        </AlertDescription>
      </Alert>
    </div>
  );
}

/** The latest measurements against the policy thresholds. */
export function ReputationChecks({ standing }: { standing: ReputationStandingRow | null }) {
  const snapshot = metricsSnapshot(standing?.metrics);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sending rates</CardTitle>
        <CardDescription>
          {snapshot
            ? `Live environments, ${formatDateTime(snapshot.windowStart)} – ${formatDateTime(snapshot.windowEnd)}. Measured ${formatDateTime(standing?.lastEvaluatedAt)}.`
            : "Not measured yet: rates are computed once live emails bounce or get complaints."}
        </CardDescription>
      </CardHeader>
      {snapshot && snapshot.checks.length > 0 ? (
        <CardPanel className="flex flex-col gap-5">
          {snapshot.checks.map((check) => {
            const ceiling = check.suspendThreshold ?? 1;
            const percent = Math.min(100, ((check.rate ?? 0) / (ceiling || 1)) * 100);
            return (
              <div className="flex flex-col gap-2" key={check.trigger}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-medium text-sm">{triggerLabel(check.trigger)}</span>
                  <span className="text-sm tabular-nums">
                    {formatRate(check.rate)}{" "}
                    <span className="text-muted-foreground">
                      ({check.count} of {check.volume})
                    </span>
                  </span>
                </div>
                <Meter
                  aria-label={`${triggerLabel(check.trigger)} relative to the suspension threshold`}
                  max={100}
                  value={percent}
                >
                  <MeterTrack className="rounded-full">
                    <MeterIndicator
                      className={
                        check.severity === "suspend"
                          ? "bg-destructive"
                          : check.severity === "warning"
                            ? "bg-warning"
                            : "bg-success"
                      }
                    />
                  </MeterTrack>
                </Meter>
                <p className="text-muted-foreground text-xs">
                  {check.message} Warning at {formatRate(check.warningThreshold)}, suspension at{" "}
                  {formatRate(check.suspendThreshold)}
                  {check.minimumVolume ? `, from ${check.minimumVolume} recipients` : ""}.
                </p>
              </div>
            );
          })}
        </CardPanel>
      ) : null}
    </Card>
  );
}

const EVENT_LABELS: Record<ReputationEventWithActor["type"], string> = {
  warning_raised: "Warning raised",
  warning_cleared: "Warning cleared",
  suspended: "Suspended",
  reinstated: "Reinstated",
  policy_updated: "Policy updated",
};

/** Standing history. `showInternal` adds who acted and their notes (platform admins only). */
export function ReputationHistory(props: {
  events: ReputationEventWithActor[];
  showInternal?: boolean;
}) {
  const events = props.showInternal
    ? props.events
    : props.events.filter((event) => event.type !== "policy_updated");
  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
      </CardHeader>
      <CardPanel className="p-2">
        {events.length === 0 ? (
          <p className="px-4 py-3 text-muted-foreground text-sm">No changes yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>By</TableHead>
                {props.showInternal ? <TableHead>Note</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(event.createdAt)}
                  </TableCell>
                  <TableCell className="font-medium">{EVENT_LABELS[event.type]}</TableCell>
                  <TableCell>{triggerLabel(event.trigger)}</TableCell>
                  <TableCell>
                    {event.actor === "system"
                      ? "Automatic"
                      : props.showInternal
                        ? (event.actorEmail ?? "Admin")
                        : "COSS"}
                  </TableCell>
                  {props.showInternal ? (
                    <TableCell className="max-w-xs whitespace-normal text-muted-foreground">
                      {event.note ?? "—"}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardPanel>
    </Card>
  );
}
