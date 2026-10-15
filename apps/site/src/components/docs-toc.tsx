"use client";
import { cn } from "@coss/ui/lib/utils";
import type { TOCItemType } from "fumadocs-core/toc";
import { useEffect, useMemo, useRef, useState } from "react";
import { useActiveIndicator } from "@/lib/use-active-indicator";

function useActiveItem(itemIds: string[]) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    // Default to the first item until a heading scrolls into view.
    if (!activeId && itemIds.length) setActiveId(itemIds[0] ?? null);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: "0% 0% -80% 0%" },
    );
    const elements = itemIds.flatMap((id) => document.getElementById(id) ?? []);
    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [itemIds, activeId]);

  return activeId;
}

/** "On This Page", the table of contents of coss.com/ui. */
export function DocsTableOfContents({
  toc,
  className,
}: {
  toc: TOCItemType[];
  className?: string;
}) {
  const itemIds = useMemo(() => toc.map((item) => item.url.replace("#", "")), [toc]);
  const activeHeading = useActiveItem(itemIds);
  const list = useRef<HTMLDivElement>(null);
  const indicator = useActiveIndicator(list, activeHeading ? `#${activeHeading}` : null);

  if (!toc.length) return null;

  return (
    <div className={cn("z-10 flex flex-col gap-1 py-2 ps-6 pe-4 text-sm", className)}>
      <p className="flex h-7 items-center font-medium text-xs">On This Page</p>
      <div
        className="relative ms-3.5 flex flex-col gap-0.5 before:absolute before:inset-y-0 before:-left-3.25 before:w-px before:bg-border"
        ref={list}
      >
        {indicator.rect && (
          <span
            aria-hidden
            className={cn(
              "absolute top-0 -left-3.25 w-0.5 rounded-full bg-primary motion-reduce:transition-none",
              indicator.animate && "transition-[translate,height] duration-200 ease-out",
            )}
            style={{
              translate: `0 ${indicator.rect.top + 1}px`,
              height: indicator.rect.height - 2,
            }}
          />
        )}
        {toc.map((item) => (
          <a
            className="py-1 text-[.8125rem] text-sidebar-foreground leading-4.5 no-underline transition-colors hover:bg-transparent hover:text-foreground data-[active=true]:bg-transparent data-[depth=3]:ps-3.5 data-[depth=4]:ps-5.5 data-[active=true]:text-foreground"
            data-active={item.url === `#${activeHeading}`}
            data-depth={item.depth}
            href={item.url}
            key={item.url}
          >
            {item.title}
          </a>
        ))}
      </div>
    </div>
  );
}
