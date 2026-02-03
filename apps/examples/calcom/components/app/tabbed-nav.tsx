import { cn } from "@coss/ui/lib/utils";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type Tab = {
  icon?: React.ReactNode;
  title: string;
  url: string;
};

type TabbedNavProps = {
  ariaLabel?: string;
  className?: string;
  dataSlot?: string;
  tabs: Tab[];
};

function TabbedNav({ ariaLabel, className, dataSlot, tabs }: TabbedNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const anyTabHasQuery = tabs.some((t) => t.url.includes("?"));
  const currentView = searchParams.get("view");

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "flex w-fit items-center gap-x-0.5 rounded-lg bg-muted p-0.5 text-muted-foreground/72",
        className,
      )}
      data-slot={dataSlot}
    >
      {tabs.map((tab) => {
        const tabUrl = tab.url.split("?")[0];
        const tabHasQuery = tab.url.includes("?");
        const tabView = tab.url.split("?view=")[1];

        let isActive = false;

        if (anyTabHasQuery) {
          if (tabHasQuery) {
            isActive = pathname === tabUrl && tabView === currentView;
          } else {
            isActive = pathname === tabUrl && !currentView;
          }
        } else {
          isActive = pathname === tabUrl;
        }
        const isIconOnly = !!tab.icon;
        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            aria-label={isIconOnly ? tab.title : undefined}
            className={cn(
              "relative flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-md font-medium text-sm outline-none transition-[color,background-color,box-shadow] not-aria-[current=page]:hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-background aria-[current=page]:text-foreground aria-[current=page]:shadow-sm/5 dark:aria-[current=page]:bg-input",
              isIconOnly ? "w-8" : "gap-1.5 whitespace-nowrap px-2.5",
            )}
            href={tab.url}
            key={tab.url}
          >
            {tab.icon ?? tab.title}
          </Link>
        );
      })}
    </nav>
  );
}

export { TabbedNav };
export type { Tab, TabbedNavProps };
