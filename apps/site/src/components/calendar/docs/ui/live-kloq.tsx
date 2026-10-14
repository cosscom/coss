"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import type { KloqPaneProps } from "./kloq-pane";

/* The engine is the only heavy part of a live frame, so it is the only part that loads lazily:
   pages without a demo never request it, and the frame around it is real markup from the start. */
const KloqPane = dynamic(() => import("./kloq-pane"));

/** A live <Kloq> filling its parent, which must have a height. */
export function LiveKloq(props: KloqPaneProps) {
  return (
    <Suspense fallback={null}>
      <KloqPane {...props} />
    </Suspense>
  );
}
