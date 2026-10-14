import { cn } from "@coss/ui/lib/utils";
import Link from "next/link";

/** A segmented row of filter links (status: all / sent / failed…); works without JavaScript. */
export function FilterLinks(props: {
  options: { value: string; label: string; href: string }[];
  value: string;
  className?: string;
}) {
  return (
    <nav
      aria-label="Filter"
      className={cn(
        "flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-lg bg-muted p-0.5",
        props.className,
      )}
    >
      {props.options.map((option) => {
        const active = option.value === props.value;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-7 shrink-0 items-center rounded-md px-2.5 text-sm transition-colors",
              active
                ? "bg-background font-medium text-foreground shadow-sm/5 dark:bg-input"
                : "text-muted-foreground hover:text-foreground",
            )}
            href={option.href}
            key={option.value}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
