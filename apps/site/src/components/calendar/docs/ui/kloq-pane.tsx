"use client";

import { Kloq, type KloqProps, type KloqView, useKloq } from "kloq";
import { type ReactNode, useEffect } from "react";

export type KloqPaneProps = KloqProps & {
  /** the stock <Kloq.Toolbar /> */
  toolbar?: boolean;
  /** told the view the calendar is drawing — a narrow box collapses a week to a day */
  onView?: (view: KloqView) => void;
  children?: ReactNode;
};

function ReportView({ onChange }: { onChange: (view: KloqView) => void }) {
  const { viewSetting } = useKloq();
  useEffect(() => onChange(viewSetting), [viewSetting, onChange]);
  return null;
}

/** The calendar inside a docs frame. Everything that imports the engine lives behind this module. */
export default function KloqPane({ toolbar, onView, children, ...props }: KloqPaneProps) {
  return (
    <Kloq {...props}>
      {onView && <ReportView onChange={onView} />}
      {toolbar ? <Kloq.Toolbar /> : null}
      {children}
    </Kloq>
  );
}
