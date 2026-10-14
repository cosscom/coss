"use client";

import type { KloqProps, KloqView } from "kloq";
import { type ReactNode, useState } from "react";
import { Dot, Live, LiveFrame, StatusBar, StatusText } from "./ui/live-frame";
import { LiveKloq } from "./ui/live-kloq";

const viewLabel = (v: KloqView) => (typeof v === "number" ? `${v}-day` : v);

/** A live <Kloq> in a docs page: ephemeral store, design-mode hint off. */
export function DocDemo({
  className,
  height = "28rem",
  toolbar = false,
  children,
  ...props
}: KloqProps & {
  className?: string;
  height?: string;
  /** the stock <Kloq.Toolbar /> — a prop because server-component pages can't reach statics on a client reference */
  toolbar?: boolean;
  children?: ReactNode;
}) {
  const [view, setView] = useState<KloqView>(props.view ?? props.defaultView ?? "week");
  return (
    <LiveFrame data-doc-demo className={className}>
      <StatusBar>
        <StatusText>
          <Live />
          <Dot />
          <span>{viewLabel(view)}</span>
          <Dot />
          <span>nothing is saved</span>
        </StatusText>
        <StatusText className="max-sm:hidden">drag anything</StatusText>
      </StatusBar>
      <div className="bg-background" style={{ height }}>
        <LiveKloq
          persistence={false}
          designMode={false}
          {...props}
          toolbar={toolbar}
          onView={setView}
        >
          {children}
        </LiveKloq>
      </div>
    </LiveFrame>
  );
}
