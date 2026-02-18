"use client";

import { DrawerPreview as DrawerPrimitive } from "@base-ui/react/drawer";
import { XIcon } from "lucide-react";
import { cn } from "@/registry/default/lib/utils";
import { Button } from "@/registry/default/ui/button";
import { ScrollArea } from "@/registry/default/ui/scroll-area";

const DrawerCreateHandle = DrawerPrimitive.createHandle;

function Drawer({
  swipeDirection,
  side = "right",
  ...props
}: DrawerPrimitive.Root.Props & {
  side?: "right" | "left" | "top" | "bottom";
}) {
  const directionMap: Record<
    string,
    DrawerPrimitive.Root.Props["swipeDirection"]
  > = {
    bottom: "down",
    left: "left",
    right: "right",
    top: "up",
  };

  return (
    <DrawerPrimitive.Root
      swipeDirection={swipeDirection ?? directionMap[side]}
      {...props}
    />
  );
}

const DrawerPortal = DrawerPrimitive.Portal;

function DrawerTrigger(props: DrawerPrimitive.Trigger.Props) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerClose(props: DrawerPrimitive.Close.Props) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerBackdrop({
  className,
  ...props
}: DrawerPrimitive.Backdrop.Props) {
  return (
    <DrawerPrimitive.Backdrop
      className={cn(
        "fixed inset-0 z-50 bg-black/32 opacity-[calc(1-var(--drawer-swipe-progress))] backdrop-blur-sm transition-[opacity] duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:opacity-0 data-starting-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-swiping:duration-0",
        className,
      )}
      data-slot="drawer-backdrop"
      {...props}
    />
  );
}

function DrawerViewport({
  className,
  side,
  variant = "default",
  ...props
}: DrawerPrimitive.Viewport.Props & {
  side?: "right" | "left" | "top" | "bottom";
  variant?: "default" | "inset";
}) {
  return (
    <DrawerPrimitive.Viewport
      className={cn(
        "fixed inset-0 z-50 grid",
        side === "bottom" && "grid grid-rows-[1fr_auto] pt-12",
        side === "top" && "grid grid-rows-[auto_1fr] pb-12",
        side === "left" && "flex justify-start",
        side === "right" && "flex justify-end",
        variant === "inset" && "sm:p-4",
      )}
      data-slot="drawer-viewport"
      {...props}
    />
  );
}

function DrawerPopup({
  className,
  children,
  showCloseButton = true,
  side = "right",
  variant = "default",
  ...props
}: DrawerPrimitive.Popup.Props & {
  showCloseButton?: boolean;
  side?: "right" | "left" | "top" | "bottom";
  variant?: "default" | "inset";
}) {
  return (
    <DrawerPortal>
      <DrawerBackdrop />
      <DrawerViewport side={side} variant={variant}>
        <DrawerPrimitive.Popup
          className={cn(
            "relative flex max-h-full min-h-0 w-full min-w-0 flex-col bg-popover not-dark:bg-clip-padding text-popover-foreground shadow-lg/5 transition-[transform] duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform before:pointer-events-none before:absolute before:inset-0 before:shadow-[0_1px_--theme(--color-black/4%)] dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
            side === "bottom" &&
              "row-start-2 translate-y-[calc(var(--drawer-snap-point-offset)+var(--drawer-swipe-movement-y))] border-t data-ending-style:translate-y-full data-starting-style:translate-y-full",
            side === "top" &&
              "data-starting-style:-translate-y-full data-ending-style:-translate-y-full translate-y-[var(--drawer-swipe-movement-y)] border-b",
            side === "left" &&
              "data-starting-style:-translate-x-full data-ending-style:-translate-x-full w-[calc(100%-(--spacing(12)))] max-w-md translate-x-[var(--drawer-swipe-movement-x)] border-e",
            side === "right" &&
              "col-start-2 w-[calc(100%-(--spacing(12)))] max-w-md translate-x-[var(--drawer-swipe-movement-x)] border-s data-ending-style:translate-x-full data-starting-style:translate-x-full",
            variant === "inset" &&
              "before:hidden sm:rounded-2xl sm:border sm:before:rounded-[calc(var(--radius-2xl)-1px)] sm:**:data-[slot=drawer-footer]:rounded-b-[calc(var(--radius-2xl)-1px)]",
            "data-nested-drawer-open:origin-top data-nested-drawer-open:scale-[calc(1-0.05*var(--nested-drawers))] data-nested-drawer-open:opacity-[calc(1-0.1*var(--nested-drawers))]",
            "data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-swiping:duration-0",
            className,
          )}
          data-slot="drawer-popup"
          {...props}
        >
          {children}
          {showCloseButton && (
            <DrawerPrimitive.Close
              aria-label="Close"
              className="absolute end-2 top-2"
              render={<Button size="icon" variant="ghost" />}
            >
              <XIcon />
            </DrawerPrimitive.Close>
          )}
        </DrawerPrimitive.Popup>
      </DrawerViewport>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-6 in-[[data-slot=drawer-popup]:has([data-slot=drawer-panel])]:pb-3 max-sm:pb-4",
        className,
      )}
      data-slot="drawer-header"
      {...props}
    />
  );
}

function DrawerFooter({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & {
  variant?: "default" | "bare";
}) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 px-6 sm:flex-row sm:justify-end",
        variant === "default" && "border-t bg-muted/72 py-4",
        variant === "bare" &&
          "in-[[data-slot=drawer-popup]:has([data-slot=drawer-panel])]:pt-3 pt-4 pb-6",
        className,
      )}
      data-slot="drawer-footer"
      {...props}
    />
  );
}

function DrawerTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      className={cn(
        "font-heading font-semibold text-xl leading-none",
        className,
      )}
      data-slot="drawer-title"
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: DrawerPrimitive.Description.Props) {
  return (
    <DrawerPrimitive.Description
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="drawer-description"
      {...props}
    />
  );
}

function DrawerPanel({
  className,
  scrollFade = true,
  ...props
}: React.ComponentProps<"div"> & { scrollFade?: boolean }) {
  return (
    <ScrollArea scrollFade={scrollFade}>
      <div
        className={cn(
          "p-6 in-[[data-slot=drawer-popup]:has([data-slot=drawer-header])]:pt-1 in-[[data-slot=drawer-popup]:has([data-slot=drawer-footer]:not(.border-t))]:pb-1",
          className,
        )}
        data-slot="drawer-panel"
        {...props}
      />
    </ScrollArea>
  );
}

export {
  DrawerCreateHandle,
  Drawer,
  DrawerTrigger,
  DrawerPortal,
  DrawerClose,
  DrawerBackdrop,
  DrawerBackdrop as DrawerOverlay,
  DrawerPopup,
  DrawerPopup as DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
  DrawerPanel,
  DrawerViewport,
};
