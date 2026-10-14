import { Badge } from "@coss/ui/components/badge";
import { cn } from "@coss/ui/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";
import { TEXT_LINK } from "@/components/calendar/site/text-link";
import { CTA } from "./tiers";

/** Point from an editable detail to the source installation guide. */
export async function Upsell({ children, className }: { children: ReactNode; className?: string }) {
  const cta = CTA;
  return (
    <p
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-muted-foreground",
        className,
      )}
    >
      <Badge variant="outline">Source</Badge>
      <span>{children}</span>
      <Link href={cta.href} className={TEXT_LINK}>
        {cta.upsell}
      </Link>
    </p>
  );
}
