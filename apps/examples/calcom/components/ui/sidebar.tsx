"use client";

import { mergeProps } from "@base-ui-components/react/merge-props";
import { useRender } from "@base-ui-components/react/use-render";
import { ScrollArea } from "@coss/ui/components/scroll-area";
import { Separator } from "@coss/ui/components/separator";
import { Skeleton } from "@coss/ui/components/skeleton";
import {
  Tooltip,
  TooltipCreateHandle,
  TooltipPopup,
  TooltipProvider,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import { cn } from "@coss/ui/lib/utils";
import * as React from "react";
import { useIsBetweenMdAndLg, useIsMobile } from "@/hooks/use-mobile";

type SidebarTooltipHandle = ReturnType<
  typeof TooltipCreateHandle<React.ComponentType>
>;

export const sidebarTooltipHandle: SidebarTooltipHandle =
  TooltipCreateHandle<React.ComponentType>();

const SidebarMenuOpenContext = React.createContext<{
  openMenuCount: number;
  registerMenu: () => () => void;
}>({
  openMenuCount: 0,
  registerMenu: () => () => {},
});

function SidebarProvider({
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const [openMenuCount, setOpenMenuCount] = React.useState(0);

  const registerMenu = React.useCallback(() => {
    setOpenMenuCount((prev) => prev + 1);
    return () => {
      setOpenMenuCount((prev) => Math.max(0, prev - 1));
    };
  }, []);

  return (
    <SidebarMenuOpenContext.Provider value={{ openMenuCount, registerMenu }}>
      <TooltipProvider delay={150} timeout={0}>
        <div
          className={cn(
            "group/sidebar-wrapper isolate flex min-h-svh w-full bg-sidebar [--sidebar-width:4rem] lg:[--sidebar-width:16rem]",
            className,
          )}
          data-slot="sidebar-wrapper"
          {...props}
        >
          {children}
          <Tooltip handle={sidebarTooltipHandle}>
            {({ payload: Payload }) => (
              <TooltipPopup
                align="center"
                className={openMenuCount > 0 ? "hidden" : undefined}
                side="right"
              >
                {Payload !== undefined && <Payload />}
              </TooltipPopup>
            )}
          </Tooltip>
        </div>
      </TooltipProvider>
    </SidebarMenuOpenContext.Provider>
  );
}

export function useSidebarMenuOpen() {
  return React.useContext(SidebarMenuOpenContext);
}

function Sidebar({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className="group peer hidden w-(--sidebar-width) text-sidebar-foreground md:block"
      data-slot="sidebar"
    >
      <div
        className={cn(
          "fixed inset-y-0 h-svh w-(--sidebar-width) pt-2",
          className,
        )}
        data-slot="sidebar-container"
        {...props}
      >
        <div
          className="flex h-full w-full flex-col"
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function SidebarInset({
  className,
  children,
  ...props
}: React.ComponentProps<"main">) {
  return (
    <main
      className={cn(
        "relative flex w-full min-w-0 flex-1 flex-col border-sidebar-border bg-background not-dark:bg-clip-padding shadow-black/5 shadow-lg before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-2xl)-1px)] before:shadow-[0_1px_--theme(--color-black/6%)] md:my-2 md:me-2 md:rounded-2xl md:border dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
        className,
      )}
      data-slot="sidebar-inset"
      {...props}
    >
      <div className="px-4 py-6 max-md:pb-24 md:p-6 lg:px-10">{children}</div>
    </main>
  );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-2 px-1 py-2 lg:px-2", className)}
      data-sidebar="header"
      data-slot="sidebar-header"
      {...props}
    />
  );
}

function SidebarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      className={cn("mx-2 w-auto bg-sidebar-border", className)}
      data-sidebar="separator"
      data-slot="sidebar-separator"
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <ScrollArea scrollFade>
      <div
        className={cn("flex h-full flex-col gap-2 px-2", className)}
        data-sidebar="content"
        data-slot="sidebar-content"
        {...props}
      />
    </ScrollArea>
  );
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative flex w-full min-w-0 flex-col px-1 py-2 lg:px-2",
        className,
      )}
      data-sidebar="group"
      data-slot="sidebar-group"
      {...props}
    />
  );
}

function SidebarGroupLabel({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">) {
  const defaultProps = {
    className: cn(
      "flex h-8 shrink-0 items-center rounded-lg px-2 gap-2 font-medium text-sidebar-foreground text-xs outline-hidden ring-sidebar-ring transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
      "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
      className,
    ),
    "data-sidebar": "group-label",
    "data-slot": "sidebar-group-label",
  };

  return useRender({
    defaultTagName: "div",
    props: mergeProps(defaultProps, props),
    render,
  });
}

function SidebarGroupAction({
  className,
  render,
  ...props
}: useRender.ComponentProps<"button">) {
  const defaultProps = {
    className: cn(
      "absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-lg p-0 text-sidebar-foreground outline-hidden ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg:not([class*='size-'])]:size-4 [&>svg]:shrink-0",
      "after:-inset-2 after:absolute md:after:hidden",
      "md:max-lg:hidden",
      className,
    ),
    "data-sidebar": "group-action",
    "data-slot": "sidebar-group-action",
  };

  return useRender({
    defaultTagName: "button",
    props: mergeProps(defaultProps, props),
    render,
  });
}

function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("w-full text-sm", className)}
      data-sidebar="group-content"
      data-slot="sidebar-group-content"
      {...props}
    />
  );
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn("flex min-w-0 flex-col gap-1 lg:w-full", className)}
      data-sidebar="menu"
      data-slot="sidebar-menu"
      {...props}
    />
  );
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      className={cn("group/menu-item relative", className)}
      data-sidebar="menu-item"
      data-slot="sidebar-menu-item"
      {...props}
    />
  );
}

function SidebarMenuButton({
  isActive = false,
  tooltip,
  className,
  render,
  ...props
}: useRender.ComponentProps<"button"> & {
  isActive?: boolean;
  tooltip?: string | React.ComponentType;
}) {
  const isMobile = useIsMobile();
  const isBetweenMdAndLg = useIsBetweenMdAndLg();
  const state = isBetweenMdAndLg ? "collapsed" : "expanded";
  const showTooltip = state === "collapsed" && !isMobile;

  const defaultProps = {
    className: cn(
      "peer/menu-button relative cursor-pointer flex w-full items-center gap-2 overflow-hidden rounded-lg p-2 text-left text-sm outline-hidden ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pe-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground data-pressed:bg-sidebar-accent data-pressed:text-sidebar-accent-foreground max-lg:size-10 max-lg:p-0 max-lg:justify-center h-8 [&>span:last-child]:truncate md:[&>svg:not([class*='size-'])]:size-4 [&>svg:not([class*='size-'])]:size-5 [&>svg]:shrink-0 font-medium text-sidebar-foreground",
      className,
    ),
    "data-active": isActive,
    "data-sidebar": "menu-button",
    "data-slot": "sidebar-menu-button",
  };

  const buttonProps = mergeProps<"button">(defaultProps, props);

  const buttonElement = useRender({
    defaultTagName: "button",
    props: buttonProps,
    render,
  });

  if (!tooltip || !showTooltip) {
    return buttonElement;
  }

  // Convert string tooltip to a component
  const TooltipContent = typeof tooltip === "string" ? () => tooltip : tooltip;

  return (
    <TooltipTrigger
      className="after:-bottom-1 after:-inset-x-1 after:absolute after:top-0"
      handle={sidebarTooltipHandle}
      payload={TooltipContent}
      render={buttonElement as React.ReactElement<Record<string, unknown>>}
    />
  );
}

function SidebarMenuAction({
  className,
  showOnHover = false,
  render,
  ...props
}: useRender.ComponentProps<"button"> & {
  showOnHover?: boolean;
}) {
  const defaultProps = {
    className: cn(
      "absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-lg p-0 text-sidebar-foreground outline-hidden ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg:not([class*='size-'])]:size-4 [&>svg]:shrink-0",
      "after:-inset-2 after:absolute md:after:hidden",
      "md:max-lg:hidden",
      showOnHover &&
        "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0",
      className,
    ),
    "data-sidebar": "menu-action",
    "data-slot": "sidebar-menu-action",
  };

  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(defaultProps, props),
    render,
  });
}

function SidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}: React.ComponentProps<"div"> & {
  showIcon?: boolean;
}) {
  // Random width between 50 to 90%.
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`;
  }, []);

  return (
    <div
      className={cn("flex h-8 items-center gap-2 rounded-lg px-2", className)}
      data-sidebar="menu-skeleton"
      data-slot="sidebar-menu-skeleton"
      {...props}
    >
      {showIcon && (
        <Skeleton
          className="size-4 rounded-lg"
          data-sidebar="menu-skeleton-icon"
        />
      )}
      <Skeleton
        className="h-4 max-w-(--skeleton-width) flex-1"
        data-sidebar="menu-skeleton-text"
        style={
          {
            "--skeleton-width": width,
          } as React.CSSProperties
        }
      />
    </div>
  );
}

function SidebarMenuSub({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn(
        "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-sidebar-border border-l px-2.5 py-0.5",
        "md:max-lg:hidden",
        className,
      )}
      data-sidebar="menu-sub"
      data-slot="sidebar-menu-sub"
      {...props}
    />
  );
}

function SidebarMenuSubItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      className={cn("group/menu-sub-item relative", className)}
      data-sidebar="menu-sub-item"
      data-slot="sidebar-menu-sub-item"
      {...props}
    />
  );
}

function SidebarMenuSubButton({
  isActive = false,
  className,
  render,
  ...props
}: useRender.ComponentProps<"a"> & {
  isActive?: boolean;
}) {
  const defaultProps = {
    className: cn(
      "-translate-x-px flex h-7 min-w-0 items-center gap-2 overflow-hidden rounded-lg px-2 text-sm text-sidebar-foreground outline-hidden ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg:not([class*='size-'])]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
      "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
      "md:max-lg:hidden",
      className,
    ),
    "data-active": isActive,
    "data-sidebar": "menu-sub-button",
    "data-slot": "sidebar-menu-sub-button",
  };

  return useRender({
    defaultTagName: "a",
    props: mergeProps<"a">(defaultProps, props),
    render,
  });
}

export {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarSeparator,
};
