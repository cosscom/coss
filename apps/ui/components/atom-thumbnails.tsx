import { cn } from "@coss/ui/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { ReactNode } from "react";

function Text({
  className,
  variant = "main",
}: {
  className?: string;
  variant?: "main" | "secondary";
}) {
  const bgColor =
    variant === "main" ? "bg-muted-foreground/40" : "bg-muted-foreground/20";
  return <div className={cn("h-1.5 rounded-full", bgColor, className)} />;
}

function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex w-full max-w-72 flex-col rounded-2xl border bg-linear-to-b from-[color-mix(in_srgb,var(--card)_96%,var(--color-white))] to-[color-mix(in_srgb,var(--card)_99%,var(--color-black))] not-dark:bg-clip-padding text-card-foreground shadow-md/5 before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-2xl)-1px)] before:shadow-[0_-1px_--theme(--color-white/6%),0_1px_--theme(--color-black/6%)] dark:to-[color-mix(in_srgb,var(--card)_98%,var(--color-white))]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function CardPanel({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return <div className={cn("flex-1 p-6", className)}>{children}</div>;
}

const bookerCalendarDays = [
  "day-1",
  "day-2",
  "available-1",
  "day-4",
  "day-5",
  "day-6",
  "selected",
  "available-2",
  "day-9",
  "day-10",
] as const;

export const bookerThumbnail = (
  <Card className="max-w-52 [--radius-2xl:14px]">
    <CardPanel className="flex gap-3 p-3">
      <div className="flex w-14 shrink-0 flex-col gap-2">
        <div className="size-6 rounded-full bg-muted-foreground/20" />
        <Text className="w-full" variant="main" />
        <Text className="w-[85%]" variant="secondary" />
        <Text className="w-[70%]" variant="secondary" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex items-center justify-between gap-1">
          <ChevronLeftIcon className="size-3 text-muted-foreground/60" />
          <Text className="w-10" variant="secondary" />
          <ChevronRightIcon className="size-3 text-muted-foreground/60" />
        </div>
        <div className="grid grid-cols-5 gap-1">
          {bookerCalendarDays.map((day) => (
            <div
              className={cn(
                "aspect-square rounded-sm",
                day === "selected"
                  ? "bg-primary"
                  : day === "available-1" || day === "available-2"
                    ? "bg-muted-foreground/20"
                    : "bg-muted-foreground/8",
              )}
              key={day}
            />
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <div className="h-3 rounded-sm bg-muted-foreground/8" />
          <div className="h-3 rounded-sm bg-primary/80" />
          <div className="h-3 rounded-sm bg-muted-foreground/8" />
        </div>
      </div>
    </CardPanel>
  </Card>
);

const atomThumbnails: Record<string, ReactNode> = {
  booker: bookerThumbnail,
};

export function getAtomThumbnail(slug: string): ReactNode | undefined {
  return atomThumbnails[slug];
}
