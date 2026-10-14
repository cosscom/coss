import {
  CardDescription,
  CardHeader,
  CardPanel,
  Card as CardPrimitive,
  CardTitle,
} from "@coss/ui/components/card";
import { cn } from "@coss/ui/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * A docs card on the card primitive. With `href` the title is the link and its hit area covers the
 * whole card, so `media` can hold anything (a live preview) without nesting it inside an anchor.
 */
export function Card({
  title,
  description,
  href,
  external,
  media,
  lead,
  className,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  href?: string;
  external?: boolean;
  /** rendered above the text, edge to edge */
  media?: ReactNode;
  /** rendered before the title, on its line */
  lead?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  const heading = (
    <>
      {lead}
      {title}
    </>
  );
  const link = "flex items-center gap-2 outline-none after:absolute after:inset-0";
  return (
    <CardPrimitive
      className={cn(
        "docs-card h-full overflow-hidden",
        href &&
          "transition-colors hover:border-ring has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring",
        className,
      )}
    >
      {media && <div className="border-b">{media}</div>}
      <CardHeader>
        <CardTitle>
          {href && external ? (
            <a href={href} target="_blank" rel="noreferrer" className={link}>
              {heading}
            </a>
          ) : href ? (
            <Link href={href} className={link}>
              {heading}
            </Link>
          ) : (
            <span className="flex items-center gap-2">{heading}</span>
          )}
        </CardTitle>
        {description && <CardDescription className="text-pretty">{description}</CardDescription>}
      </CardHeader>
      {children && <CardPanel className="flex flex-wrap content-end gap-1.5">{children}</CardPanel>}
    </CardPrimitive>
  );
}
