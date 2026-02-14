"use client";

import {
  Toast,
  type ToastManager,
  type ToastManagerAddOptions,
  type ToastManagerEvent,
  type ToastManagerPromiseOptions,
} from "@base-ui/react/toast";
import {
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  LoaderCircleIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useEffect, useRef } from "react";

import { cn } from "@/registry/default/lib/utils";
import { buttonVariants } from "@/registry/default/ui/button";

type RepeatEffect = "bounce" | "shake";

interface ToastData {
  tooltipStyle?: boolean;
  showClose?: boolean;
  repeatCount?: number;
  repeatEffect?: RepeatEffect;
}

interface ToastAddOptions extends ToastManagerAddOptions<ToastData> {
  dedupe?: boolean;
  dedupeKey?: string;
  repeatEffect?: RepeatEffect;
}

const DEFAULT_EFFECTS: Record<string, RepeatEffect> = {
  error: "shake",
  info: "bounce",
  success: "bounce",
  warning: "bounce",
};

function getDefaultEffect(type?: string): RepeatEffect {
  return (type && DEFAULT_EFFECTS[type]) || "bounce";
}

function buildFingerprint(
  type: string | undefined,
  title: unknown,
  description: unknown,
): string | null {
  if (typeof title !== "string") return null;
  if (description !== undefined && typeof description !== "string") return null;
  return `${type ?? ""}::${title}::${description ?? ""}`;
}

function resolvePromiseOptions<T, Data extends object>(
  options:
    | string
    | ToastManagerAddOptions<Data>
    | ((result: T) => string | ToastManagerAddOptions<Data>),
  result?: T,
): ToastManagerAddOptions<Data> {
  if (typeof options === "string") return { description: options };
  if (typeof options === "function") {
    const resolved = options(result as T);
    return typeof resolved === "string" ? { description: resolved } : resolved;
  }
  return options;
}

function createDedupedToastManager(): {
  add: (options: ToastAddOptions) => string;
  close: (id: string) => void;
  update: ToastManager["update"];
  promise: ToastManager["promise"];
  provider: ToastManager;
} {
  const baseManager: ToastManager = Toast.createToastManager();

  const activeMap = new Map<string, string>();
  const toastOrder: string[] = [];
  const toastDataById = new Map<string, ToastData>();

  function registerToastOrder(id: string) {
    const idx = toastOrder.indexOf(id);
    if (idx !== -1) toastOrder.splice(idx, 1);
    toastOrder.unshift(id);
  }

  function unregisterToastOrder(id: string) {
    const idx = toastOrder.indexOf(id);
    if (idx !== -1) toastOrder.splice(idx, 1);
  }

  function isFrontmostToast(id: string): boolean {
    return toastOrder[0] === id;
  }

  baseManager[" subscribe"]((event: ToastManagerEvent) => {
    const id = event.options?.id;
    if (!id) return;
    if (event.action === "add") registerToastOrder(id);
    if (event.action === "close") unregisterToastOrder(id);
  });

  function cleanupActiveMap(id: string) {
    for (const [key, toastId] of activeMap) {
      if (toastId === id) {
        activeMap.delete(key);
        break;
      }
    }
  }

  function addTracked(
    key: string,
    rest: Omit<ToastAddOptions, "dedupe" | "dedupeKey" | "repeatEffect">,
  ): string {
    const originalOnRemove = rest.onRemove;
    const id = baseManager.add({
      ...rest,
      onRemove() {
        cleanupActiveMap(id);
        toastDataById.delete(id);
        originalOnRemove?.();
      },
    });
    toastDataById.set(id, rest.data ? { ...rest.data } : {});
    activeMap.set(key, id);
    return id;
  }

  function resolveDedupeKey(options: ToastAddOptions): string | null {
    if (options.dedupe === false) return null;
    if (options.dedupeKey) return options.dedupeKey;
    return buildFingerprint(options.type, options.title, options.description);
  }

  function add(options: ToastAddOptions): string {
    const {
      dedupe: _dedupe,
      dedupeKey: _dedupeKey,
      repeatEffect,
      ...rest
    } = options;
    const key = resolveDedupeKey(options);

    if (key === null) {
      return baseManager.add(rest);
    }

    const existingId = activeMap.get(key);

    if (!existingId) {
      return addTracked(key, rest);
    }

    if (!toastOrder.includes(existingId)) {
      cleanupActiveMap(existingId);
      toastDataById.delete(existingId);
      return addTracked(key, rest);
    }

    if (isFrontmostToast(existingId)) {
      const effect = repeatEffect ?? getDefaultEffect(rest.type);
      const previousData = toastDataById.get(existingId) ?? {};
      const previousRepeatCount =
        typeof previousData.repeatCount === "number"
          ? previousData.repeatCount
          : 0;
      const mergedData: ToastData = {
        ...previousData,
        ...(rest.data ?? {}),
        repeatCount: previousRepeatCount + 1,
        repeatEffect: effect,
      };

      baseManager.update(existingId, {
        data: mergedData,
        timeout: rest.timeout,
      });
      toastDataById.set(existingId, mergedData);
      return existingId;
    }

    cleanupActiveMap(existingId);
    unregisterToastOrder(existingId);
    toastDataById.delete(existingId);
    baseManager.close(existingId);
    return addTracked(key, rest);
  }

  function promise<Value, Data extends ToastData = ToastData>(
    promiseValue: Promise<Value>,
    options: ToastManagerPromiseOptions<Value, Data>,
  ): Promise<Value> {
    const loadingOptions = resolvePromiseOptions<never, Data>(options.loading);
    const id = baseManager.add({
      ...loadingOptions,
      type: "loading",
    });
    const handledPromise = promiseValue
      .then((result) => {
        const successOptions = resolvePromiseOptions<Value, Data>(
          options.success,
          result,
        );
        baseManager.update(id, {
          ...successOptions,
          timeout: (successOptions as { timeout?: number }).timeout,
          type: "success",
        });
        return result;
      })
      .catch((error: unknown) => {
        const errorOptions = resolvePromiseOptions<unknown, Data>(
          options.error,
          error,
        );
        baseManager.update(id, {
          ...errorOptions,
          timeout: (errorOptions as { timeout?: number }).timeout,
          type: "error",
        });
        return Promise.reject(error);
      });
    return handledPromise;
  }

  return {
    add,
    close: (id: string) => baseManager.close(id),
    promise,
    provider: baseManager,
    update: baseManager.update.bind(baseManager),
  };
}

const toastManager = createDedupedToastManager();
const anchoredToastManager = createDedupedToastManager();

function useRepeatEffect(toast: { data?: ToastData }) {
  const ref = useRef<HTMLDivElement>(null);
  const prevRepeatCountRef = useRef(toast.data?.repeatCount);

  useEffect(() => {
    const repeatCount = toast.data?.repeatCount;
    const effect = toast.data?.repeatEffect;
    if (repeatCount === undefined || repeatCount === prevRepeatCountRef.current)
      return;
    prevRepeatCountRef.current = repeatCount;

    const el = ref.current;
    if (!el || !effect) return;

    el.removeAttribute("data-repeat-effect");
    const raf = requestAnimationFrame(() => {
      el.setAttribute("data-repeat-effect", effect);
    });
    return () => cancelAnimationFrame(raf);
  }, [toast.data?.repeatCount, toast.data?.repeatEffect]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cleanup = () => el.removeAttribute("data-repeat-effect");
    el.addEventListener("animationend", cleanup);
    return () => el.removeEventListener("animationend", cleanup);
  }, []);

  return ref;
}

const TOAST_ICONS = {
  error: CircleAlertIcon,
  info: InfoIcon,
  loading: LoaderCircleIcon,
  success: CircleCheckIcon,
  warning: TriangleAlertIcon,
} as const;

type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

interface ToastProviderProps extends Toast.Provider.Props {
  position?: ToastPosition;
}

function ToastProvider({
  children,
  position = "bottom-right",
  ...props
}: ToastProviderProps) {
  return (
    <Toast.Provider toastManager={toastManager.provider} {...props}>
      {children}
      <Toasts position={position} />
    </Toast.Provider>
  );
}

function StackedToastItem({
  toast,
  position,
  isTop,
}: {
  toast: Parameters<typeof Toast.Root>[0]["toast"];
  position: ToastPosition;
  isTop: boolean;
}) {
  const effectRef = useRepeatEffect(toast);
  const Icon = toast.type
    ? TOAST_ICONS[toast.type as keyof typeof TOAST_ICONS]
    : null;

  return (
    <Toast.Root
      className={cn(
        "absolute z-[calc(9999-var(--toast-index))] h-(--toast-calc-height) w-full select-none rounded-lg border bg-popover not-dark:bg-clip-padding text-popover-foreground shadow-lg/5 [transition:transform_.5s_cubic-bezier(.22,1,.36,1),opacity_.5s,height_.15s] before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
        // Base positioning using data-position
        "data-[position*=right]:right-0 data-[position*=right]:left-auto",
        "data-[position*=left]:right-auto data-[position*=left]:left-0",
        "data-[position*=center]:right-0 data-[position*=center]:left-0",
        "data-[position*=top]:top-0 data-[position*=top]:bottom-auto data-[position*=top]:origin-top",
        "data-[position*=bottom]:top-auto data-[position*=bottom]:bottom-0 data-[position*=bottom]:origin-bottom",
        // Gap fill for hover
        "after:absolute after:left-0 after:h-[calc(var(--toast-gap)+1px)] after:w-full",
        "data-[position*=top]:after:top-full",
        "data-[position*=bottom]:after:bottom-full",
        // Define some variables
        "[--toast-calc-height:var(--toast-frontmost-height,var(--toast-height))] [--toast-gap:--spacing(3)] [--toast-peek:--spacing(3)] [--toast-scale:calc(max(0,1-(var(--toast-index)*.1)))] [--toast-shrink:calc(1-var(--toast-scale))]",
        // Define offset-y variable
        "data-[position*=top]:[--toast-calc-offset-y:calc(var(--toast-offset-y)+var(--toast-index)*var(--toast-gap)+var(--toast-swipe-movement-y))]",
        "data-[position*=bottom]:[--toast-calc-offset-y:calc(var(--toast-offset-y)*-1+var(--toast-index)*var(--toast-gap)*-1+var(--toast-swipe-movement-y))]",
        // Default state transform
        "data-[position*=top]:transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)+(var(--toast-index)*var(--toast-peek))+(var(--toast-shrink)*var(--toast-calc-height))))_scale(var(--toast-scale))]",
        "data-[position*=bottom]:transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--toast-peek))-(var(--toast-shrink)*var(--toast-calc-height))))_scale(var(--toast-scale))]",
        // Limited state
        "data-limited:opacity-0",
        // Expanded state
        "data-expanded:h-(--toast-height)",
        "data-position:data-expanded:transform-[translateX(var(--toast-swipe-movement-x))_translateY(var(--toast-calc-offset-y))]",
        // Starting and ending animations
        "data-[position*=top]:data-starting-style:transform-[translateY(calc(-100%-var(--toast-inset)))]",
        "data-[position*=bottom]:data-starting-style:transform-[translateY(calc(100%+var(--toast-inset)))]",
        "data-ending-style:opacity-0",
        // Ending animations (direction-aware, position-aware for default)
        "data-[position*=top]:data-ending-style:not-data-limited:not-data-swipe-direction:transform-[translateY(calc(-100%-var(--toast-inset)))]",
        "data-[position*=bottom]:data-ending-style:not-data-limited:not-data-swipe-direction:transform-[translateY(calc(100%+var(--toast-inset)))]",
        "data-ending-style:data-[swipe-direction=left]:transform-[translateX(calc(var(--toast-swipe-movement-x)-100%-var(--toast-inset)))_translateY(var(--toast-calc-offset-y))]",
        "data-ending-style:data-[swipe-direction=right]:transform-[translateX(calc(var(--toast-swipe-movement-x)+100%+var(--toast-inset)))_translateY(var(--toast-calc-offset-y))]",
        "data-ending-style:data-[swipe-direction=up]:transform-[translateY(calc(var(--toast-swipe-movement-y)-100%-var(--toast-inset)))]",
        "data-ending-style:data-[swipe-direction=down]:transform-[translateY(calc(var(--toast-swipe-movement-y)+100%+var(--toast-inset)))]",
        // Ending animations (expanded)
        "data-expanded:data-ending-style:data-[swipe-direction=left]:transform-[translateX(calc(var(--toast-swipe-movement-x)-100%-var(--toast-inset)))_translateY(var(--toast-calc-offset-y))]",
        "data-expanded:data-ending-style:data-[swipe-direction=right]:transform-[translateX(calc(var(--toast-swipe-movement-x)+100%+var(--toast-inset)))_translateY(var(--toast-calc-offset-y))]",
        "data-expanded:data-ending-style:data-[swipe-direction=up]:transform-[translateY(calc(var(--toast-swipe-movement-y)-100%-var(--toast-inset)))]",
        "data-expanded:data-ending-style:data-[swipe-direction=down]:transform-[translateY(calc(var(--toast-swipe-movement-y)+100%+var(--toast-inset)))]",
        // Repeat-effect animations (bounce/shake on dedup)
        "data-[repeat-effect=bounce]:animate-toast-bounce",
        "data-[repeat-effect=shake]:animate-toast-shake",
      )}
      data-position={position}
      key={toast.id}
      ref={effectRef}
      swipeDirection={
        position.includes("center")
          ? [isTop ? "up" : "down"]
          : position.includes("left")
            ? ["left", isTop ? "up" : "down"]
            : ["right", isTop ? "up" : "down"]
      }
      toast={toast}
    >
      <Toast.Content className="pointer-events-auto flex items-center justify-between gap-1.5 overflow-hidden px-3.5 py-3 text-sm transition-opacity duration-250 data-behind:not-data-expanded:pointer-events-none data-behind:opacity-0 data-expanded:opacity-100">
        <div className="flex gap-2">
          {Icon && (
            <div
              className="[&>svg]:h-lh [&>svg]:w-4 [&_svg]:pointer-events-none [&_svg]:shrink-0"
              data-slot="toast-icon"
            >
              <Icon className="in-data-[type=loading]:animate-spin in-data-[type=error]:text-destructive in-data-[type=info]:text-info in-data-[type=success]:text-success in-data-[type=warning]:text-warning in-data-[type=loading]:opacity-80" />
            </div>
          )}

          <div className="flex flex-col gap-0.5">
            <Toast.Title className="font-medium" data-slot="toast-title" />
            <Toast.Description
              className="text-muted-foreground"
              data-slot="toast-description"
            />
          </div>
        </div>
        {toast.actionProps && (
          <Toast.Action
            className={buttonVariants({ size: "xs" })}
            data-slot="toast-action"
          >
            {toast.actionProps.children}
          </Toast.Action>
        )}
      </Toast.Content>
    </Toast.Root>
  );
}

function Toasts({ position = "bottom-right" }: { position: ToastPosition }) {
  const { toasts } = Toast.useToastManager();
  const isTop = position.startsWith("top");

  return (
    <Toast.Portal data-slot="toast-portal">
      <Toast.Viewport
        className={cn(
          "fixed z-50 mx-auto flex w-[calc(100%-var(--toast-inset)*2)] max-w-90 [--toast-inset:--spacing(4)] sm:[--toast-inset:--spacing(8)]",
          "data-[position*=top]:top-(--toast-inset)",
          "data-[position*=bottom]:bottom-(--toast-inset)",
          "data-[position*=left]:left-(--toast-inset)",
          "data-[position*=right]:right-(--toast-inset)",
          "data-[position*=center]:-translate-x-1/2 data-[position*=center]:left-1/2",
        )}
        data-position={position}
        data-slot="toast-viewport"
      >
        {toasts.map((toast) => (
          <StackedToastItem
            isTop={isTop}
            key={toast.id}
            position={position}
            toast={toast}
          />
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
}

function AnchoredToastProvider({ children, ...props }: Toast.Provider.Props) {
  return (
    <Toast.Provider toastManager={anchoredToastManager.provider} {...props}>
      {children}
      <AnchoredToasts />
    </Toast.Provider>
  );
}

function AnchoredToastItem({
  toast,
}: {
  toast: Parameters<typeof Toast.Root>[0]["toast"];
}) {
  const effectRef = useRepeatEffect(toast);
  const Icon = toast.type
    ? TOAST_ICONS[toast.type as keyof typeof TOAST_ICONS]
    : null;
  const tooltipStyle =
    (toast.data as ToastData | undefined)?.tooltipStyle ?? false;
  const positionerProps = toast.positionerProps;

  if (!positionerProps?.anchor) {
    return null;
  }

  return (
    <Toast.Positioner
      className="z-50 max-w-[min(--spacing(64),var(--available-width))]"
      data-slot="toast-positioner"
      key={toast.id}
      sideOffset={positionerProps.sideOffset ?? 4}
      toast={toast}
    >
      <Toast.Root
        className={cn(
          "relative text-balance border bg-popover not-dark:bg-clip-padding text-popover-foreground text-xs transition-[scale,opacity] before:pointer-events-none before:absolute before:inset-0 before:shadow-[0_1px_--theme(--color-black/4%)] data-ending-style:scale-98 data-starting-style:scale-98 data-ending-style:opacity-0 data-starting-style:opacity-0 dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
          "data-[repeat-effect=bounce]:animate-toast-bounce",
          "data-[repeat-effect=shake]:animate-toast-shake",
          tooltipStyle
            ? "rounded-md shadow-md/5 before:rounded-[calc(var(--radius-md)-1px)]"
            : "rounded-lg shadow-lg/5 before:rounded-[calc(var(--radius-lg)-1px)]",
        )}
        data-slot="toast-popup"
        ref={effectRef}
        toast={toast}
      >
        {tooltipStyle ? (
          <Toast.Content className="pointer-events-auto px-2 py-1">
            <Toast.Title data-slot="toast-title" />
          </Toast.Content>
        ) : (
          <Toast.Content className="pointer-events-auto flex items-center justify-between gap-1.5 overflow-hidden px-3.5 py-3 text-sm">
            <div className="flex gap-2">
              {Icon && (
                <div
                  className="[&>svg]:h-lh [&>svg]:w-4 [&_svg]:pointer-events-none [&_svg]:shrink-0"
                  data-slot="toast-icon"
                >
                  <Icon className="in-data-[type=loading]:animate-spin in-data-[type=error]:text-destructive in-data-[type=info]:text-info in-data-[type=success]:text-success in-data-[type=warning]:text-warning in-data-[type=loading]:opacity-80" />
                </div>
              )}

              <div className="flex flex-col gap-0.5">
                <Toast.Title className="font-medium" data-slot="toast-title" />
                <Toast.Description
                  className="text-muted-foreground"
                  data-slot="toast-description"
                />
              </div>
            </div>
            {toast.actionProps && (
              <Toast.Action
                className={buttonVariants({ size: "xs" })}
                data-slot="toast-action"
              >
                {toast.actionProps.children}
              </Toast.Action>
            )}
          </Toast.Content>
        )}
      </Toast.Root>
    </Toast.Positioner>
  );
}

function AnchoredToasts() {
  const { toasts } = Toast.useToastManager();

  return (
    <Toast.Portal data-slot="toast-portal-anchored">
      <Toast.Viewport
        className="outline-none"
        data-slot="toast-viewport-anchored"
      >
        {toasts.map((toast) => (
          <AnchoredToastItem key={toast.id} toast={toast} />
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
}

export {
  ToastProvider,
  type ToastPosition,
  toastManager,
  AnchoredToastProvider,
  anchoredToastManager,
};
