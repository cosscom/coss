"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { LiveFrame, StatusBar } from "./live-frame";

/* These two import the engine at module level, so the whole frame loads lazily. The server still
   renders them; the fallback only shows on a client-side navigation and holds the frame's height. */
const LazyConstraintsDemo = dynamic(() =>
  import("../constraints-demo").then((m) => m.ConstraintsDemo),
);
const LazyQuickAddInputDemo = dynamic(() =>
  import("../quick-add-input-demo").then((m) => m.QuickAddInputDemo),
);

function Pending({ className }: { className: string }) {
  return (
    <LiveFrame aria-hidden>
      <StatusBar />
      <div className={className} />
    </LiveFrame>
  );
}

export function ConstraintsDemo() {
  return (
    <Suspense fallback={<Pending className="h-120 bg-background" />}>
      <LazyConstraintsDemo />
    </Suspense>
  );
}

/* This frame's height follows how its phrase chips wrap, so the placeholder steps with the frame's own width. */
const QUICK_ADD_PENDING =
  "h-87.75 bg-background max-sm:@xs:h-84 max-sm:@sm:h-80 max-sm:@md:h-71 max-sm:@lg:h-62 sm:h-59 sm:@4xl:h-51";

export function QuickAddInputDemo() {
  return (
    <Suspense fallback={<Pending className={QUICK_ADD_PENDING} />}>
      <LazyQuickAddInputDemo />
    </Suspense>
  );
}
