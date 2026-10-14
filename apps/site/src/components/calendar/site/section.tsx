import { cn } from "@coss/ui/lib/utils";
import type { ReactNode } from "react";
import { Eyebrow } from "./pin";

/** The one page column: header, every section and the footer share it. Pair with `px-6`. */
export const CONTAINER = "mx-auto w-full max-w-7xl";

export function Section({
  id,
  className,
  inner,
  children,
}: {
  id?: string;
  className?: string;
  inner?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cn("border-t", className)}>
      <div className={cn(CONTAINER, "px-6 py-20 sm:py-28", inner)}>{children}</div>
    </section>
  );
}

export function SectionHead({
  index,
  label,
  title,
  lede,
  className,
  as: Heading = "h2",
  size = "default",
}: {
  index?: string;
  label: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
  /** `lg` is the landing's step, under its display H1; `default` sits under `page-title` */
  size?: "default" | "lg";
}) {
  return (
    <div className={cn("max-w-3xl", className)}>
      <Eyebrow index={index}>{label}</Eyebrow>
      <Heading
        className={cn(
          "mt-5 font-heading font-semibold tracking-tight text-balance",
          size === "lg" ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl",
        )}
      >
        {title}
      </Heading>
      {lede && <p className="mt-5 max-w-2xl text-pretty text-lg text-muted-foreground">{lede}</p>}
    </div>
  );
}

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("font-mono text-xs text-muted-foreground", className)}>{children}</span>
  );
}

/** A ruled sheet: horizontal rules run full-bleed, two vertical rules frame the page column. */
export function Sheet({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div
        aria-hidden
        className={cn(
          CONTAINER,
          "pointer-events-none absolute inset-y-0 left-1/2 z-10 -translate-x-1/2 border-x",
        )}
      />
      {children}
    </div>
  );
}

export function Row({
  children,
  className,
  inner,
  flush = false,
}: {
  children: ReactNode;
  className?: string;
  inner?: string;
  /** no horizontal padding: the content meets the frame lines */
  flush?: boolean;
}) {
  return (
    <div className={cn("border-t", className)}>
      <div className={cn(CONTAINER, "relative", !flush && "px-6", inner)}>{children}</div>
    </div>
  );
}
