"use client";

import { Button } from "@coss/ui/components/button";
import { EyeIcon, StarIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { starProject, watchProject } from "@/app/actions";
import { compact } from "@/lib/format";

/** Watch and Star, GitHub's two buttons that survive: no Fork, there is nothing to fork. */
export function ProjectActions(props: {
  owner: string;
  slug: string;
  starred: boolean;
  stars: number;
  watching: boolean;
  watchers: number;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [star, setStar] = useOptimistic({ on: props.starred, count: props.stars });
  const [watch, setWatch] = useOptimistic({ on: props.watching, count: props.watchers });
  return (
    <div className="flex items-center gap-2">
      <Button
        aria-pressed={watch.on}
        onClick={() =>
          start(async () => {
            setWatch({ on: !watch.on, count: watch.count + (watch.on ? -1 : 1) });
            await watchProject(props.owner, props.slug);
            router.refresh();
          })
        }
        size="sm"
        variant="outline"
      >
        <EyeIcon aria-hidden />
        {watch.on ? "Watching" : "Watch"}
        <Count>{compact(watch.count)}</Count>
      </Button>
      <Button
        aria-pressed={star.on}
        onClick={() =>
          start(async () => {
            setStar({ on: !star.on, count: star.count + (star.on ? -1 : 1) });
            await starProject(props.owner, props.slug);
            router.refresh();
          })
        }
        size="sm"
        variant="outline"
      >
        <StarIcon aria-hidden className={star.on ? "fill-current" : undefined} />
        {star.on ? "Starred" : "Star"}
        <Count>{compact(star.count)}</Count>
      </Button>
    </div>
  );
}

function Count({ children }: { children: string }) {
  return (
    <span className="ms-0.5 rounded-full bg-muted px-1.5 font-mono text-[11px] text-muted-foreground">
      {children}
    </span>
  );
}
