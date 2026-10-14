import { Badge, type BadgeProps } from "@coss/ui/components/badge";
import { cn } from "@coss/ui/lib/utils";

export { Eyebrow, Pin } from "@/components/calendar/site/pin";

export function LiveDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("size-1.5 shrink-0 rounded-full bg-brand motion-safe:animate-pulse", className)}
    />
  );
}

export function Chip({ className, ...props }: BadgeProps) {
  return (
    <Badge
      variant="secondary"
      {...props}
      className={cn("font-mono font-normal text-muted-foreground", className)}
    />
  );
}
