"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import * as React from "react";
import * as ReactDOM from "react-dom";

const useIsoLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

type Size = { width: number; height: number };

export type SizeTransitionAxis = "both" | "width" | "height";

type SizeTransitionContextValue = {
  currentRef: React.RefObject<HTMLElement | null>;
  transitioning: boolean;
  startingStyle: boolean;
};

const SizeTransitionContext: React.Context<SizeTransitionContextValue | null> =
  React.createContext<SizeTransitionContextValue | null>(null);

function useSizeTransitionContext(): SizeTransitionContextValue {
  const context = React.useContext(SizeTransitionContext);
  if (!context) {
    throw new Error(
      "`SizeTransitionPanel` must be used within a `SizeTransition`.",
    );
  }
  return context;
}

function measureSize(element: HTMLElement): Size {
  return { width: element.offsetWidth, height: element.offsetHeight };
}

function freezeSize(
  element: HTMLElement,
  size: Size,
  axis: SizeTransitionAxis,
) {
  if (axis !== "height") {
    element.style.setProperty("--size-width", `${size.width}px`);
  }
  if (axis !== "width") {
    element.style.setProperty("--size-height", `${size.height}px`);
  }
}

function releaseSize(element: HTMLElement) {
  element.style.removeProperty("--size-width");
  element.style.removeProperty("--size-height");
}

/**
 * Runs `callback` once every animation currently running on `element` has
 * finished. Falls back to running synchronously when the Web Animations API is
 * unavailable (e.g. jsdom) or nothing is animating.
 */
function runAfterAnimations(
  element: HTMLElement | null,
  callback: () => void,
  signal: AbortSignal,
): number {
  if (!element || typeof element.getAnimations !== "function") {
    callback();
    return -1;
  }
  return requestAnimationFrame(() => {
    if (signal.aborted) {
      return;
    }
    const animations = element.getAnimations();
    if (animations.length === 0) {
      callback();
      return;
    }
    Promise.all(animations.map((animation) => animation.finished))
      .then(() => {
        if (!signal.aborted) {
          callback();
        }
      })
      .catch(() => {
        if (!signal.aborted) {
          callback();
        }
      });
  });
}

export type SizeTransitionProps = useRender.ComponentProps<"div"> & {
  /** Value whose change triggers a size animation and content cross-fade. */
  transitionKey: React.Key;
  /**
   * Which dimensions to animate. Non-animated dimensions stay `auto`.
   * @default "both"
   */
  axis?: SizeTransitionAxis;
};

/**
 * Animates between the sizes of successive `SizeTransitionPanel` children and
 * cross-fades outgoing content into incoming content when `transitionKey`
 * changes.
 *
 * Size is exposed as `--size-width` / `--size-height` (pixels during a
 * transition, `auto` at rest). Opt in via classes such as
 * `w-(--size-width,auto) h-(--size-height,auto) transition-[width,height]`.
 */
export function SizeTransition({
  axis = "both",
  transitionKey,
  children,
  render,
  ...props
}: SizeTransitionProps): React.ReactElement {
  const rootRef = React.useRef<HTMLElement | null>(null);
  const currentRef = React.useRef<HTMLElement | null>(null);
  const previousRef = React.useRef<HTMLDivElement | null>(null);
  const snapshotRef = React.useRef<HTMLElement | null>(null);
  const committedSizeRef = React.useRef<Size | null>(null);
  const previousKeyRef = React.useRef<React.Key>(transitionKey);
  const isFirstRenderRef = React.useRef(true);

  const [previousContent, setPreviousContent] =
    React.useState<HTMLElement | null>(null);
  const [previousSize, setPreviousSize] = React.useState<Size | null>(null);
  const [startingStyle, setStartingStyle] = React.useState(false);

  const isTransitioning = previousContent !== null;

  useIsoLayoutEffect(() => {
    const element = rootRef.current;
    if (!element) {
      return;
    }

    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      previousKeyRef.current = transitionKey;
      committedSizeRef.current = measureSize(element);
      return;
    }

    if (previousKeyRef.current === transitionKey) {
      return;
    }
    previousKeyRef.current = transitionKey;

    const outgoingContent = snapshotRef.current;
    const previousSizeValue = committedSizeRef.current;

    if (outgoingContent) {
      setPreviousContent(outgoingContent);
      setStartingStyle(true);
    }

    releaseSize(element);
    currentRef.current?.style.removeProperty("width");
    currentRef.current?.style.setProperty("transition", "none");
    const newSize = measureSize(element);
    committedSizeRef.current = newSize;

    // Pin the entering panel to its final width so content is clipped, not reflowed.
    if (axis !== "height") {
      currentRef.current?.style.setProperty("width", `${newSize.width}px`);
    }

    if (previousSizeValue) {
      freezeSize(element, previousSizeValue, axis);
      setPreviousSize(previousSizeValue);
    }

    const sizeAbort = new AbortController();
    const fadeAbort = new AbortController();
    let sizeFinishFrame = -1;
    let fadeFinishFrame = -1;

    const frame = requestAnimationFrame(() => {
      // Force a reflow so starting styles register before ending styles apply.
      void element.offsetHeight;

      freezeSize(element, newSize, axis);
      currentRef.current?.style.removeProperty("transition");
      ReactDOM.flushSync(() => setStartingStyle(false));

      sizeFinishFrame = runAfterAnimations(
        element,
        () => {
          releaseSize(element);
          currentRef.current?.style.removeProperty("width");
        },
        sizeAbort.signal,
      );
      fadeFinishFrame = runAfterAnimations(
        currentRef.current,
        () => {
          setPreviousContent(null);
          setPreviousSize(null);
          snapshotRef.current = null;
        },
        fadeAbort.signal,
      );
    });

    return () => {
      sizeAbort.abort();
      fadeAbort.abort();
      cancelAnimationFrame(frame);
      cancelAnimationFrame(sizeFinishFrame);
      cancelAnimationFrame(fadeFinishFrame);
    };
  }, [axis, transitionKey]);

  useIsoLayoutEffect(() => {
    const container = previousRef.current;
    if (!container || !previousContent) {
      return;
    }
    container.replaceChildren(previousContent);
  }, [previousContent]);

  // Declared last so the transition effect reads the prior render's snapshot.
  useIsoLayoutEffect(() => {
    const source = currentRef.current;
    if (!source) {
      return;
    }
    const clone = source.cloneNode(true) as HTMLElement;
    clone.removeAttribute("data-current");
    clone.removeAttribute("data-starting-style");
    clone.style.removeProperty("width");
    clone.style.removeProperty("transition");
    snapshotRef.current = clone;
  });

  const contextValue = React.useMemo<SizeTransitionContextValue>(
    () => ({ currentRef, startingStyle, transitioning: isTransitioning }),
    [isTransitioning, startingStyle],
  );

  const content = isTransitioning ? (
    <React.Fragment>
      {children}
      {/* After `children` so inserting this layer never remounts the panel. */}
      <div
        data-ending-style={startingStyle ? undefined : ""}
        data-previous=""
        inert
        key="previous"
        ref={previousRef}
        style={{
          left: 0,
          position: "absolute",
          top: 0,
          ...(previousSize
            ? { height: previousSize.height, width: previousSize.width }
            : null),
        }}
      />
    </React.Fragment>
  ) : (
    children
  );

  const defaultProps = {
    className: "relative",
    "data-slot": "size-transition",
  };

  const element = useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(defaultProps, props, { children: content }),
    render,
    ref: rootRef,
    state: { transitioning: isTransitioning },
    stateAttributesMapping: {
      transitioning: (value) => (value ? { "data-transitioning": "" } : null),
    },
  });

  return (
    <SizeTransitionContext.Provider value={contextValue}>
      {element}
    </SizeTransitionContext.Provider>
  );
}

export type SizeTransitionPanelProps = useRender.ComponentProps<"div">;

/**
 * Active content layer of a `SizeTransition`. Uses the `render` element as
 * `data-current` so no extra wrapper is added.
 */
export function SizeTransitionPanel({
  render,
  ...props
}: SizeTransitionPanelProps): React.ReactElement {
  const { currentRef, startingStyle, transitioning } =
    useSizeTransitionContext();

  return useRender({
    defaultTagName: "div",
    props,
    render,
    ref: currentRef,
    state: { current: true, startingStyle: transitioning && startingStyle },
    stateAttributesMapping: {
      current: () => ({
        "data-current": "",
        "data-slot": "size-transition-panel",
      }),
      startingStyle: (value) => (value ? { "data-starting-style": "" } : null),
    },
  });
}
