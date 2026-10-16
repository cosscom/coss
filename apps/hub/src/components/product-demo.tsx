"use client";

import { Button } from "@coss/ui/components/button";
import { Skeleton } from "@coss/ui/components/skeleton";
import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";

const FRAME_WIDTH = 1280;
const FRAME_HEIGHT = 820;
const MOBILE_BELOW = 768;
const MOBILE_HEIGHT = 640;

/**
 * The product itself as the demo: a project page of the hub, framed and scaled down to the
 * column, live (same origin) and clickable; "Open" goes to the real thing full size.
 */
export function ProductDemo({ path, label }: { path: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  // The frame is at least FRAME_WIDTH wide and scaled to the column; a wider column shows it 1:1.
  const [frame, setFrame] = useState({ width: FRAME_WIDTH, scale: 0.5 });
  const [loaded, setLoaded] = useState(false);
  // Measured before paint, so the frame never jumps; the box's height comes from CSS (aspect
  // ratio, capped at the frame's height), not from this state.
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => {
      // A phone gets the page at its own width (so the hub's mobile layout), not a shrunken desktop.
      const mobile = node.clientWidth < MOBILE_BELOW;
      const width = mobile ? node.clientWidth : Math.max(FRAME_WIDTH, node.clientWidth);
      setFrame({ width, scale: node.clientWidth / width });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <figure className="flex w-full flex-col gap-3">
      <div className="overflow-hidden rounded-xl border bg-popover shadow-xs/5">
        <div className="flex items-center gap-2 border-b px-3 py-2">
          {/* macOS window controls. */}
          <span aria-hidden className="flex gap-2 ps-1">
            <span className="size-3 rounded-full bg-[#ff5f57] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.2)]" />
            <span className="size-3 rounded-full bg-[#febc2e] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.2)]" />
            <span className="size-3 rounded-full bg-[#28c840] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.2)]" />
          </span>
          <span className="ms-2 truncate rounded bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
            hub.coss.com{path}
          </span>
          <Button className="ms-auto" render={<Link href={path} />} size="xs" variant="ghost">
            Open
            <ExternalLinkIcon aria-hidden />
          </Button>
        </div>
        <div
          className="relative w-full overflow-hidden max-md:h-[640px] md:aspect-[1280/820] md:max-h-[820px]"
          ref={ref}
        >
          {!loaded && <DemoSkeleton />}
          <iframe
            className={`absolute top-0 left-0 origin-top-left border-0 transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            scrolling="no"
            src={path}
            style={{
              width: frame.width,
              height: frame.width < MOBILE_BELOW ? MOBILE_HEIGHT : FRAME_HEIGHT,
              transform: `scale(${frame.scale})`,
            }}
            title={label}
          />
        </div>
      </div>
      <figcaption className="font-mono text-[11px] text-muted-foreground">{label}</figcaption>
    </figure>
  );
}

/** The page's shape while the frame loads: header, project head and tabs, a sheet and its sidebar. */
function DemoSkeleton() {
  return (
    <div aria-hidden className="absolute inset-0 flex flex-col">
      <div className="flex h-14 items-center gap-4 border-b px-6">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="ms-auto h-7 w-48 rounded-lg" />
        <Skeleton className="size-7 rounded-full" />
      </div>
      <div className="flex flex-col gap-4 border-b px-6 pt-5">
        <div className="flex items-center gap-3">
          <Skeleton className="size-7 rounded-md" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="ms-auto h-7 w-24 rounded-lg" />
          <Skeleton className="h-7 w-24 rounded-lg" />
        </div>
        <div className="flex gap-6">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      <div className="grid flex-1 gap-8 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-11 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex flex-wrap gap-1.5 pt-1">
            {["a", "b", "c", "d", "e"].map((k) => (
              <Skeleton className="h-5 w-16 rounded-full" key={k} />
            ))}
          </div>
          <Skeleton className="mt-3 h-4 w-20" />
          <div className="flex flex-wrap gap-1.5">
            {["a", "b", "c", "d", "e", "f", "g"].map((k) => (
              <Skeleton className="size-8 rounded-full" key={k} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
