import { Button } from "@coss/ui/components/button";
import { Card, CardDescription, CardTitle } from "@coss/ui/components/card";
import { cn } from "@coss/ui/lib/utils";
import Link from "next/link";
import { SOURCE_HREF, TIERS } from "./tiers";

function Points({ points, dot }: { points: readonly string[]; dot: string }) {
  return (
    <ul className="mt-5 flex flex-col gap-2 text-sm">
      {points.map((pt) => (
        <li key={pt} className="flex gap-2.5">
          <span aria-hidden className={cn("mt-2 size-1.5 shrink-0 rounded-full", dot)} />
          <span>{pt}</span>
        </li>
      ))}
    </ul>
  );
}

/** Two ways to install the same calendar. */
export function TierCards({ freeHref }: { freeHref: string }) {
  return (
    <Card className="grid divide-y overflow-clip md:grid-cols-2 md:divide-x md:divide-y-0">
      <div className="flex flex-col p-6 sm:p-8">
        <CardTitle render={<h3 />}>{TIERS.npm.name}</CardTitle>
        <CardDescription className="mt-2 text-pretty">{TIERS.npm.blurb}</CardDescription>
        <Points points={TIERS.npm.points} dot="bg-muted-foreground" />
        <div className="mt-auto pt-6">
          <Button variant="outline" render={<Link href={freeHref} />}>
            {TIERS.npm.cta}
          </Button>
        </div>
      </div>
      {/* a dark island in both schemes, on the page's own dark tokens */}
      <div className="dark flex">
        <div
          data-kloq-root
          className="flex flex-1 flex-col bg-background p-6 text-foreground sm:p-8"
        >
          <CardTitle render={<h3 />}>{TIERS.source.name}</CardTitle>
          <CardDescription className="mt-2 text-pretty">{TIERS.source.blurb}</CardDescription>
          <Points points={TIERS.source.points} dot="bg-muted-foreground" />
          <div className="mt-auto pt-6">
            <Button render={<Link href={SOURCE_HREF} />}>{TIERS.source.cta}</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
