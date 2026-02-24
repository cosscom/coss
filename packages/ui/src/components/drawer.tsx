"use client";

import { DrawerPreview as DrawerPrimitive } from "@base-ui/react/drawer";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { XIcon } from "lucide-react";
import { createContext, useContext } from "react";
import { cn } from "@coss/ui/lib/utils";
import { Button } from "@coss/ui/components/button";
import { ScrollArea } from "@coss/ui/components/scroll-area";

type DrawerSide = "right" | "left" | "top" | "bottom";

const DrawerContext = createContext<{ side: DrawerSide }>({ side: "bottom" });

const DrawerCreateHandle = DrawerPrimitive.createHandle;

const directionMap: Record<
  DrawerSide,
  DrawerPrimitive.Root.Props["swipeDirection"]
> = {
  bottom: "down",
  left: "left",
  right: "right",
  top: "up",
};

function Drawer({
  swipeDirection,
  side = "bottom",
  ...props
}: DrawerPrimitive.Root.Props & {
  side?: DrawerSide;
}) {
  return (
    <DrawerContext.Provider value={{ side }}>
      <DrawerPrimitive.Root
        swipeDirection={swipeDirection ?? directionMap[side]}
        {...props}
      />
    </DrawerContext.Provider>
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
        "fixed inset-0 z-50 bg-black/32 opacity-[calc(1-var(--drawer-swipe-progress))] backdrop-blur-sm transition-opacity duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:opacity-0 data-starting-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-swiping:duration-0 supports-[-webkit-touch-callout:none]:absolute",
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
  side?: DrawerSide;
  variant?: "default" | "straight" | "inset";
}) {
  return (
    <DrawerPrimitive.Viewport
      className={cn(
        "fixed inset-0 z-50 [--bleed:--spacing(12)] [--inset:--spacing(0)]",
        side === "bottom" && "grid grid-rows-[1fr_auto] pt-12",
        side === "top" && "grid grid-rows-[auto_1fr] pb-12",
        side === "left" && "flex justify-start",
        side === "right" && "flex justify-end",
        variant === "inset" && "p-(--inset) sm:[--inset:--spacing(4)]",
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
  side: sideProp,
  variant = "default",
  showBar = false,
  ...props
}: DrawerPrimitive.Popup.Props & {
  showCloseButton?: boolean;
  side?: DrawerSide;
  variant?: "default" | "straight" | "inset";
  showBar?: boolean;
}) {
  const { side: contextSide } = useContext(DrawerContext);
  const side = sideProp ?? contextSide;

  return (
    <DrawerPortal>
      <DrawerBackdrop />
      <DrawerViewport side={side} variant={variant}>
        <DrawerPrimitive.Popup
          className={cn(
            "relative flex max-h-full min-h-0 w-full min-w-0 flex-col bg-popover not-dark:bg-clip-padding text-popover-foreground shadow-lg/5 transition-[transform,height,background-color] duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform before:pointer-events-none before:absolute before:inset-0 before:shadow-[0_1px_--theme(--color-black/4%)] after:pointer-events-none after:absolute after:bg-popover data-swiping:select-none data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-swiping:duration-0 dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
            side === "bottom" &&
              "transform-[translateY(calc(var(--drawer-snap-point-offset)+var(--drawer-swipe-movement-y)))] data-ending-style:transform-[translateY(calc(100%+var(--inset)))] data-starting-style:transform-[translateY(calc(100%+var(--inset)))] row-start-2 border-t after:inset-x-0 after:top-full after:h-(--bleed) has-data-[slot=drawer-bar]:pt-2",
            side === "top" &&
              "data-starting-style:transform-[translateY(calc(-100%+var(--inset)))] data-ending-style:transform-[translateY(calc(-100%+var(--inset)))] transform-[translateY(var(--drawer-swipe-movement-y))] border-b after:inset-x-0 after:bottom-full after:h-(--bleed) has-data-[slot=drawer-bar]:pb-2",
            side === "left" &&
              "data-starting-style:transform-[translateX(calc(-100%-var(--inset)))] data-ending-style:transform-[translateX(calc(-100%-var(--inset)))] transform-[translateX(var(--drawer-swipe-movement-x))] w-[calc(100%-(--spacing(12)))] max-w-md border-e after:inset-y-0 after:end-full after:w-(--bleed) has-data-[slot=drawer-bar]:pe-2",
            side === "right" &&
              "transform-[translateX(var(--drawer-swipe-movement-x))] data-ending-style:transform-[translateX(calc(100%+var(--inset)))] data-starting-style:transform-[translateX(calc(100%+var(--inset)))] col-start-2 w-[calc(100%-(--spacing(12)))] max-w-md border-s after:inset-y-0 after:start-full after:w-(--bleed) has-data-[slot=drawer-bar]:ps-2",
            variant === "inset" &&
              "before:hidden after:bg-transparent sm:rounded-2xl sm:border sm:before:rounded-[calc(var(--radius-2xl)-1px)] sm:**:data-[slot=drawer-footer]:rounded-b-[calc(var(--radius-2xl)-1px)]",
            variant === "default" &&
              cn(
                side === "bottom" &&
                  "rounded-t-2xl before:rounded-t-[calc(var(--radius-2xl)-1px)]",
                side === "top" &&
                  "rounded-b-2xl before:rounded-b-[calc(var(--radius-2xl)-1px)] **:data-[slot=drawer-footer]:rounded-b-[calc(var(--radius-2xl)-1px)]",
                side === "left" &&
                  "rounded-e-2xl before:rounded-e-[calc(var(--radius-2xl)-1px)] **:data-[slot=drawer-footer]:rounded-ee-[calc(var(--radius-2xl)-1px)]",
                side === "right" &&
                  "rounded-s-2xl before:rounded-s-[calc(var(--radius-2xl)-1px)] **:data-[slot=drawer-footer]:rounded-es-[calc(var(--radius-2xl)-1px)]",
              ),
            "[--peek:--spacing(6)] [--scale-base:calc(max(0,1-(var(--nested-drawers)*var(--stack-step))))] [--scale:clamp(0,calc(var(--scale-base)+(var(--stack-step)*var(--stack-progress))),1)] [--shrink:calc(1-var(--scale))] [--stack-peek-offset:max(0px,calc((var(--nested-drawers)-var(--stack-progress))*var(--peek)))] [--stack-progress:clamp(0,var(--drawer-swipe-progress),1)] [--stack-step:0.05] data-nested-drawer-open:overflow-hidden data-nested-drawer-open:bg-[color-mix(in_srgb,var(--popover),var(--color-black)_calc(2%*(var(--nested-drawers)-var(--stack-progress))))] dark:data-nested-drawer-open:bg-[color-mix(in_srgb,var(--popover),var(--color-black)_calc(6%*(var(--nested-drawers)-var(--stack-progress))))]",
            (side === "bottom" || side === "top") &&
              "h-(--drawer-height,auto) [--height:max(0px,calc(var(--drawer-frontmost-height,var(--drawer-height))))] data-nested-drawer-open:h-(--height)",
            side === "bottom" &&
              "data-nested-drawer-open:transform-[translateY(calc(var(--drawer-swipe-movement-y)-var(--stack-peek-offset)-(var(--shrink)*var(--height))))_scale(var(--scale))] origin-[50%_calc(100%-var(--inset))]",
            side === "top" &&
              "data-nested-drawer-open:transform-[translateY(calc(var(--drawer-swipe-movement-y)+var(--stack-peek-offset)+(var(--shrink)*var(--height))))_scale(var(--scale))] origin-[50%_var(--inset)]",
            side === "left" &&
              "data-nested-drawer-open:transform-[translateX(calc(var(--drawer-swipe-movement-x)+var(--stack-peek-offset)))_scale(var(--scale))] origin-right",
            side === "right" &&
              "data-nested-drawer-open:transform-[translateX(calc(var(--drawer-swipe-movement-x)-var(--stack-peek-offset)))_scale(var(--scale))] origin-left",
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
          {showBar && <DrawerBar />}
        </DrawerPrimitive.Popup>
      </DrawerViewport>
    </DrawerPortal>
  );
}

function DrawerHeader({
  className,
  preventSwipe = false,
  render,
  ...props
}: useRender.ComponentProps<"div"> & {
  preventSwipe?: boolean;
}) {
  const defaultProps = {
    className: cn(
      "flex flex-col gap-2 p-6 in-[[data-slot=drawer-popup]:has([data-slot=drawer-panel])]:pb-3 max-sm:pb-4",
      !preventSwipe && "cursor-default",
      className,
    ),
    "data-slot": "drawer-header",
  };

  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(defaultProps, props),
    render: preventSwipe ? <DrawerContent render={render} /> : render,
  });
}

function DrawerFooter({
  className,
  variant = "default",
  preventSwipe = true,
  render,
  ...props
}: useRender.ComponentProps<"div"> & {
  variant?: "default" | "bare";
  preventSwipe?: boolean;
}) {
  const defaultProps = {
    className: cn(
      "flex flex-col-reverse gap-2 px-6 sm:flex-row sm:justify-end",
      !preventSwipe && "cursor-default",
      variant === "default" && "border-t bg-muted/72 py-4",
      variant === "bare" &&
        "in-[[data-slot=drawer-popup]:has([data-slot=drawer-panel])]:pt-3 pt-4 pb-6",
      className,
    ),
    "data-slot": "drawer-footer",
  };

  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(defaultProps, props),
    render: preventSwipe ? <DrawerContent render={render} /> : render,
  });
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
  preventSwipe = true,
  render,
  ...props
}: useRender.ComponentProps<"div"> & {
  scrollFade?: boolean;
  preventSwipe?: boolean;
}) {
  const defaultProps = {
    className: cn(
      "p-6 in-[[data-slot=drawer-popup]:has([data-slot=drawer-header])]:pt-1 in-[[data-slot=drawer-popup]:has([data-slot=drawer-footer]:not(.border-t))]:pb-1",
      !preventSwipe && "cursor-default",
      className,
    ),
    "data-slot": "drawer-panel",
  };

  return (
    <ScrollArea scrollFade={scrollFade}>
      {useRender({
        defaultTagName: "div",
        props: mergeProps<"div">(defaultProps, props),
        render: preventSwipe ? <DrawerContent render={render} /> : render,
      })}
    </ScrollArea>
  );
}

function DrawerBar({
  className,
  side: sideProp,
  render,
  ...props
}: useRender.ComponentProps<"div"> & {
  side?: DrawerSide;
}) {
  const { side: contextSide } = useContext(DrawerContext);
  const side = sideProp ?? contextSide;
  const horizontal = side === "left" || side === "right";
  const defaultProps = {
    "aria-hidden": true as const,
    className: cn(
      "absolute flex items-center justify-center before:rounded-full before:bg-border p-3",
      horizontal
        ? "inset-y-0 before:h-12 before:w-1"
        : "inset-x-0 before:h-1 before:w-12",
      side === "top" && "bottom-0",
      side === "bottom" && "top-0",
      side === "left" && "right-0",
      side === "right" && "left-0",
      className,
    ),
    "data-slot": "drawer-bar",
  };

  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(defaultProps, props),
    render,
  });
}

const DrawerContent = DrawerPrimitive.Content;

export {
  DrawerCreateHandle,
  Drawer,
  DrawerTrigger,
  DrawerPortal,
  DrawerClose,
  DrawerBackdrop,
  DrawerPopup,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
  DrawerPanel,
  DrawerBar,
  DrawerContent,
  DrawerViewport,
};
