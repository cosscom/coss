import { cn } from "@coss/ui/lib/utils";
import type { ComponentProps } from "react";

type Level = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

/**
 * fumadocs' heading markup without its copy button: docs.css draws the hover `#` on `a[data-card]`.
 * `tabIndex={-1}` lets an in-page link (the TOC) land focus on the heading instead of on <body>.
 */
export function Heading<T extends Level>({
  as,
  id,
  className,
  children,
  ...props
}: ComponentProps<T> & { as: T }) {
  const As = as as Level;
  if (!id)
    return (
      <As {...(props as ComponentProps<Level>)} className={className}>
        {children}
      </As>
    );
  return (
    <As
      {...(props as ComponentProps<Level>)}
      id={id}
      tabIndex={-1}
      className={cn("scroll-m-28", className)}
    >
      <a data-card href={`#${id}`}>
        {children}
      </a>
    </As>
  );
}
