import { type BudgetStatus, budgetShare, overBudget } from "@coss/billing";
import { Progress, ProgressIndicator, ProgressTrack } from "@coss/ui/components/progress";
import { formatCents } from "@/lib/billing-format";

/** Spent against the budget that applies, as a bar (red once over it). */
export function BudgetCell(props: { status: BudgetStatus | undefined }) {
  const status = props.status;
  if (!status || status.amountCents === null) {
    return (
      <span className="font-mono text-muted-foreground text-xs tabular-nums">
        {status && status.spentCents > 0n ? `${formatCents(status.spentCents)} · ` : null}
        {status?.budget ? "exempt" : "no budget"}
      </span>
    );
  }
  const percent = budgetShare(status) ?? 0;
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-xs tabular-nums">
        {formatCents(status.spentCents)} of {formatCents(status.amountCents)}
        {status.fromDefault ? <span className="text-muted-foreground"> (default)</span> : null}
      </span>
      <Progress max={100} value={Math.min(100, Number.isFinite(percent) ? percent : 100)}>
        <ProgressTrack>
          <ProgressIndicator className={overBudget(status) ? "bg-destructive" : undefined} />
        </ProgressTrack>
      </Progress>
    </div>
  );
}
