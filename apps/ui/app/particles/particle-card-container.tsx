import { cn } from "@/lib/utils";

export function ParticleCardContainer({
  children,
  className,
  colSpan,
  footer,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
  footer: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-col before:pointer-events-none before:absolute before:inset-px before:rounded-[calc(var(--radius-xl)-1px)] before:bg-background",
        colSpan === 2 && "lg:col-span-2",
        className,
      )}
    >
      <div className="after:-inset-[5px] after:-z-1 relative flex min-w-0 flex-1 flex-col rounded-xl border bg-muted/72 not-dark:bg-clip-padding shadow-sm/5 before:pointer-events-none before:absolute before:inset-0 before:rounded-xl before:shadow-[0_1px_--theme(--color-black/6%)] after:pointer-events-none after:absolute after:rounded-[calc(var(--radius-xl)+4px)] after:border after:border-border/64 dark:before:shadow-[0_-1px_--theme(--color-white/6%)]">
        <div className="-m-px relative flex min-h-50 min-w-0 flex-1 flex-col flex-wrap items-center justify-center overflow-x-auto rounded-t-xl rounded-b-lg border bg-background bg-clip-padding p-6 [clip-path:inset(1px_1px_-1rem_1px_round_var(--radius-xl)_var(--radius-xl)_0_0)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] lg:px-8 lg:py-12">
          {children}
        </div>
        <div className="flex items-center gap-3 rounded-b-xl p-2">{footer}</div>
      </div>
    </div>
  );
}
