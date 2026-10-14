import {
  Card,
  CardFrame,
  CardFrameAction,
  CardFrameDescription,
  CardFrameFooter,
  CardFrameHeader,
  CardFrameTitle,
} from "@coss/ui/components/card";
import { cn } from "@coss/ui/lib/utils";
import type { ReactNode } from "react";

/**
 * A titled section of a page: coss ui's framed card. The header (title, description, action) and
 * footer sit on the muted tray, the content in the raised card inside it. Put a
 * `<Table variant="card">` straight in as a child, or anything else in a `<PanelBody>`.
 */
export function Panel(props: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  id?: string;
  className?: string;
  children?: ReactNode;
}) {
  const header = props.title || props.description || props.action;
  return (
    <CardFrame className={cn("w-full min-w-0 scroll-mt-20", props.className)} id={props.id}>
      {header ? (
        <CardFrameHeader className="px-5 py-3.5">
          {props.title ? (
            <CardFrameTitle className="font-heading text-[0.9375rem] tracking-[-0.01em]">
              {props.title}
            </CardFrameTitle>
          ) : null}
          {props.description ? (
            <CardFrameDescription className="max-w-2xl">{props.description}</CardFrameDescription>
          ) : null}
          {props.action ? (
            <CardFrameAction className="flex items-center gap-2">{props.action}</CardFrameAction>
          ) : null}
        </CardFrameHeader>
      ) : null}
      {props.children}
      {props.footer ? (
        <CardFrameFooter className="px-5 py-3 text-muted-foreground text-sm">
          {props.footer}
        </CardFrameFooter>
      ) : null}
    </CardFrame>
  );
}

/** The raised card of a `Panel`; padded unless `flush` (lists and tables that draw their own rows). */
export function PanelBody(props: { flush?: boolean; className?: string; children?: ReactNode }) {
  return <Card className={cn(!props.flush && "p-5", props.className)}>{props.children}</Card>;
}

/**
 * A settings row inside a `PanelBody`: the label and its explanation on the left, the control on
 * the right (stacked on small screens). Rows are ruled by hairlines.
 */
export function PanelRow(props: {
  label: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-3 border-t px-5 py-4 first:border-t-0 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-8",
        props.className,
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="font-medium text-sm">{props.label}</div>
        {props.description ? (
          <div className="text-muted-foreground text-sm">{props.description}</div>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col items-start gap-3">{props.children}</div>
    </div>
  );
}
