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
        <PanelHeader>
          {props.title ? <PanelTitle>{props.title}</PanelTitle> : null}
          {props.description ? <PanelDescription>{props.description}</PanelDescription> : null}
          {props.action ? <PanelAction>{props.action}</PanelAction> : null}
        </PanelHeader>
      ) : null}
      {props.children}
      {props.footer ? <PanelFooter>{props.footer}</PanelFooter> : null}
    </CardFrame>
  );
}

type SlotProps = { className?: string; children?: ReactNode };

/**
 * The parts of a `Panel`'s header, for headers the props can't express (a title with badges
 * beside a wrapping action row): `<Panel><PanelHeader><PanelTitle>…`. Same slots as coss ui's
 * `CardHeader`/`CardTitle`/`CardDescription`/`CardAction`.
 */
export function PanelHeader(props: SlotProps) {
  return (
    <CardFrameHeader className={cn("px-5 py-3.5", props.className)}>
      {props.children}
    </CardFrameHeader>
  );
}

export function PanelTitle(props: SlotProps) {
  return (
    <CardFrameTitle
      className={cn("font-heading text-[0.9375rem] tracking-[-0.01em]", props.className)}
    >
      {props.children}
    </CardFrameTitle>
  );
}

export function PanelDescription(props: SlotProps) {
  return (
    <CardFrameDescription className={cn("max-w-2xl", props.className)}>
      {props.children}
    </CardFrameDescription>
  );
}

export function PanelAction(props: SlotProps) {
  return (
    <CardFrameAction className={cn("flex items-center gap-2", props.className)}>
      {props.children}
    </CardFrameAction>
  );
}

export function PanelFooter(props: SlotProps) {
  return (
    <CardFrameFooter className={cn("px-5 py-3 text-muted-foreground text-sm", props.className)}>
      {props.children}
    </CardFrameFooter>
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
