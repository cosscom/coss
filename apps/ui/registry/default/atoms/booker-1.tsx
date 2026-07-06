"use client";

import { ArrowLeftIcon, Clock3Icon } from "lucide-react";
import {
  AnimatePresence,
  animate,
  domMax,
  LazyMotion,
  MotionConfig,
  m,
} from "motion/react";
import { type RefObject, useEffect, useLayoutEffect, useRef } from "react";
import { Button } from "@/registry/default/ui/button";
import { Card } from "@/registry/default/ui/card";
import { Input } from "@/registry/default/ui/input";
import { Skeleton } from "@/registry/default/ui/skeleton";
import { BookerAvatars } from "./booker/booker-avatars";
import { BookerCalendar } from "./booker/booker-calendar";
import { BookerErrorState } from "./booker/booker-error-state";
import { type BookerLabels, getBookerLabels } from "./booker/booker-labels";
import { DurationPicker } from "./booker/duration-picker";
import { EventDescription } from "./booker/event-description";
import { HeaderBanner } from "./booker/header-banner";
import { Location } from "./booker/location";
import { TimePicker } from "./booker/time-picker";
import { TimezonePicker } from "./booker/timezone-picker";
import type { BookerTarget } from "@/lib/booker/target";
import {
  type BookerInitialData,
  type BookerStep,
  useBooker,
} from "@/lib/booker/use-booker";

const TRANSITION_DURATION = 0.45;
const TRANSITION_EASE = [0.32, 0.72, 0, 1] as const;

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

// FLIP: on step change, measure the container's current box, release it to the
// entering step's natural size to read the target, then animate the real
// width/height between the two. Animating actual dimensions (not `transform`)
// resizes the card without scaling or reflowing its content mid-transition.
function useStepResizeTransition(
  step: BookerStep,
  containerRef: RefObject<HTMLDivElement | null>,
  selectStepRef: RefObject<HTMLDivElement | null>,
  confirmStepRef: RefObject<HTMLDivElement | null>,
) {
  const isFirstRenderRef = useRef(true);
  const transitionTokenRef = useRef(0);

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    const enteringStep =
      step === "select" ? selectStepRef.current : confirmStepRef.current;

    const start = {
      height: container.offsetHeight,
      width: container.offsetWidth,
    };
    container.style.width = "auto";
    container.style.height = "auto";
    enteringStep?.style.removeProperty("width");
    void container.offsetHeight;
    const end = {
      height: container.offsetHeight,
      width: container.offsetWidth,
    };

    // Pin the entering step so it can't reflow while the container is clipped.
    if (enteringStep) {
      enteringStep.style.width = `${end.width}px`;
    }
    container.style.width = `${start.width}px`;
    container.style.height = `${start.height}px`;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const token = ++transitionTokenRef.current;
    animate(
      container,
      { height: end.height, width: end.width },
      {
        duration: prefersReducedMotion ? 0 : TRANSITION_DURATION,
        ease: TRANSITION_EASE,
      },
    )
      .then(() => {
        if (token !== transitionTokenRef.current) {
          return;
        }
        container.style.width = "";
        container.style.height = "";
        enteringStep?.style.removeProperty("width");
      })
      .catch(() => {});
  }, [step]);
}

type BookerProps = {
  target: BookerTarget;
  timezone?: string;
  initialData?: BookerInitialData;
  defaultFormValues?: Record<string, unknown>;
  onCreateBookingSuccess?: (data: unknown) => void;
  labels?: Partial<BookerLabels>;
};

export function Booker({ initialData, target, timezone, labels }: BookerProps) {
  const t = getBookerLabels(labels);
  const booker = useBooker({ initialData, target, timezone });

  const stepContainerRef = useRef<HTMLDivElement>(null);
  const selectStepRef = useRef<HTMLDivElement>(null);
  const confirmStepRef = useRef<HTMLDivElement>(null);
  useStepResizeTransition(
    booker.step,
    stepContainerRef,
    selectStepRef,
    confirmStepRef,
  );

  if (booker.error) {
    return (
      <BookerErrorState
        error={booker.error}
        labels={t}
        onRetry={booker.retry}
      />
    );
  }

  const displayMeta = booker.meta;
  const headerImageAlt = displayMeta
    ? t.headerImageAlt(displayMeta.hostName, displayMeta.eventTypeTitle)
    : "Booker header";
  const metaContentClassName = [
    displayMeta?.eventTypeImageUrl ? "relative -mt-11 @5xl:-mt-13" : "",
    "flex flex-col gap-6 @5xl:p-6 p-4",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className="@container flex flex-col items-center gap-4"
      aria-busy={booker.loadingState.busy}
    >
      <Card className="@max-3xl:w-full @3xl:flex-row @5xl:[--booker-side:--spacing(70)] [--booker-side:--spacing(56)]">
        {/* Meta */}
        <div className="@3xl:w-(--booker-side) @3xl:border-e border-b @3xl:border-b-0">
          <HeaderBanner
            alt={headerImageAlt}
            src={displayMeta?.eventTypeImageUrl}
          />
          <div className={metaContentClassName}>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <BookerAvatars
                  avatars={displayMeta?.hostAvatars}
                  fallbackName={displayMeta?.hostName}
                />
                {displayMeta ? (
                  <p className="font-medium text-muted-foreground sm:text-sm">
                    {displayMeta.hostName}
                  </p>
                ) : (
                  <Skeleton className="my-0.5 h-5 w-24 sm:h-4" />
                )}
              </div>
              <div className="flex flex-col gap-1">
                {displayMeta ? (
                  <>
                    <h1 className="font-heading @3xl:@max-5xl:text-lg text-xl">
                      {displayMeta.eventTypeTitle}
                    </h1>
                    <EventDescription
                      description={displayMeta.eventTypeDescription}
                    />
                  </>
                ) : (
                  <>
                    <Skeleton className="my-0.5 h-6 w-36" />
                    <Skeleton className="my-0.5 h-4 w-full" />
                    <Skeleton className="my-0.5 h-4 w-full" />
                  </>
                )}
              </div>
            </div>

            {displayMeta ? (
              <div className="flex flex-col gap-3 sm:text-sm">
                {displayMeta.eventTypeDurationOptions ? (
                  <DurationPicker
                    formatLabel={t.durationMinutes}
                    options={displayMeta.eventTypeDurationOptions}
                    {...booker.durationProps}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Clock3Icon
                      className="size-4.5 shrink-0 opacity-80 sm:size-4"
                      aria-hidden="true"
                    />
                    <span>
                      {displayMeta.eventTypeDurationMinutes
                        ? t.durationMinutes(
                            displayMeta.eventTypeDurationMinutes,
                          )
                        : t.durationUnknown}
                    </span>
                  </div>
                )}
                <Location
                  labels={{
                    locationOptions: t.locationOptions,
                    selectOnNextStep: t.locationSelectOnNextStep,
                  }}
                  locations={displayMeta.eventTypeLocations}
                />
                <TimezonePicker {...booker.timezoneProps} />
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <Skeleton className="my-0.5 h-4 w-36" />
                <Skeleton className="my-0.5 h-4 w-36" />
                <Skeleton className="my-0.5 h-4 w-36" />
              </div>
            )}
          </div>
        </div>
        <LazyMotion features={domMax}>
          <MotionConfig
            reducedMotion="user"
            transition={{
              duration: TRANSITION_DURATION,
              ease: TRANSITION_EASE,
            }}
          >
            <div
              ref={stepContainerRef}
              className="relative w-full @3xl:flex-1 overflow-clip"
            >
              <AnimatePresence initial={false} mode="popLayout">
                {booker.step === "select" ? (
                  <m.div
                    key="select"
                    ref={selectStepRef}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex w-full @3xl:flex-row flex-col"
                  >
                    {/* Calendar */}
                    <div className="flex @3xl:w-[min(28.75rem,100cqw-2*var(--booker-side))] w-full @3xl:shrink-0 flex-col items-center @3xl:@max-5xl:px-2 px-4 @3xl:@max-5xl:py-2 pt-3 pb-4">
                      <BookerCalendar {...booker.calendarProps} />
                    </div>
                    {/* Time picker */}
                    <TimePicker
                      labels={{
                        hour12Short: t.hour12Short,
                        hour24Short: t.hour24Short,
                        noAvailableTimes: t.noAvailableTimes,
                        noSlotsAvailable: t.noSlotsAvailable,
                        noSlotsThisDay: t.noSlotsThisDay,
                        noSlotsThisMonth: t.noSlotsThisMonth,
                        use24Hour: t.use24Hour,
                        viewFirstAvailability: t.viewFirstAvailability,
                      }}
                      {...booker.timePickerProps}
                    />
                  </m.div>
                ) : (
                  <m.div
                    key="confirm"
                    ref={confirmStepRef}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="@3xl:w-[min(28.75rem,100cqw-2*var(--booker-side))] w-full @3xl:shrink-0 @3xl:@max-5xl:px-2 px-4 @3xl:@max-5xl:py-2 pt-3 pb-4"
                  >
                    <Button variant="ghost" size="sm" onClick={booker.onBack}>
                      <ArrowLeftIcon aria-hidden="true" />
                      Back
                    </Button>
                    <Input
                      autoFocus
                      className="w-full"
                      placeholder="Your name"
                      type="text"
                    />
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          </MotionConfig>
        </LazyMotion>
      </Card>
      <a
        href="https://cal.com"
        className="font-heading text-xl"
        target="_blank"
        rel="noreferrer"
      >
        Cal.com
      </a>
    </div>
  );
}

export default Booker;
