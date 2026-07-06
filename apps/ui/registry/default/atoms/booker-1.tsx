"use client";

import { ArrowLeftIcon, Clock3Icon } from "lucide-react";
import {
  animate,
  domAnimation,
  LazyMotion,
  MotionConfig,
  useReducedMotion,
} from "motion/react";
import { type ReactNode, useEffect, useLayoutEffect, useRef } from "react";
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

const EASE = [0.32, 0.72, 0, 1] as const;
const SIZE_TRANSITION = { duration: 0.45, ease: EASE } as const;
const ENTER_TRANSITION = { delay: 0.1, duration: 0.45, ease: EASE } as const;

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

type Size = { width: number; height: number };

const measure = (element: HTMLElement): Size => ({
  width: element.offsetWidth,
  height: element.offsetHeight,
});

function useStepTransition(step: BookerStep) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousStepRef = useRef(step);
  const restingSizeRef = useRef<Size | null>(null);
  const isAnimatingRef = useRef(false);
  const reducedMotion = useReducedMotion();

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      if (!isAnimatingRef.current) {
        restingSizeRef.current = measure(container);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || previousStepRef.current === step) return;
    previousStepRef.current = step;

    const enteringStep = container.firstElementChild as HTMLElement | null;

    if (enteringStep && !reducedMotion) {
      enteringStep.style.opacity = "0";
    }

    const start = restingSizeRef.current ?? measure(container);
    container.style.width = "auto";
    container.style.height = "auto";
    enteringStep?.style.removeProperty("width");
    void container.offsetHeight;
    const end = measure(container);

    if (enteringStep) enteringStep.style.width = `${end.width}px`;
    container.style.width = `${start.width}px`;
    container.style.height = `${start.height}px`;

    isAnimatingRef.current = true;
    const sizeAnimation = animate(
      container,
      { width: end.width, height: end.height },
      reducedMotion ? { duration: 0 } : SIZE_TRANSITION,
    );
    const enterAnimation =
      enteringStep && !reducedMotion
        ? animate(enteringStep, { opacity: [0, 1] }, ENTER_TRANSITION)
        : null;

    void Promise.all([sizeAnimation, enterAnimation ?? Promise.resolve()]).then(
      () => {
        container.style.width = "";
        container.style.height = "";
        enteringStep?.style.removeProperty("width");
        enteringStep?.style.removeProperty("opacity");
        restingSizeRef.current = measure(container);
        isAnimatingRef.current = false;
      },
    );

    return () => {
      sizeAnimation.stop();
      enterAnimation?.stop();
      isAnimatingRef.current = false;
    };
  }, [step, reducedMotion]);

  return containerRef;
}

function BookerSteps({
  step,
  children,
}: {
  step: BookerStep;
  children: ReactNode;
}) {
  const containerRef = useStepTransition(step);

  return (
    <div
      ref={containerRef}
      className="relative w-full @3xl:flex-1 overflow-clip"
    >
      {children}
    </div>
  );
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
      className="@container flex w-full flex-col items-center gap-4"
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
        <LazyMotion features={domAnimation}>
          <MotionConfig reducedMotion="user" transition={SIZE_TRANSITION}>
            <BookerSteps step={booker.step}>
              {booker.step === "select" ? (
                <div
                  key="select"
                  className="flex w-full @3xl:flex-row flex-col"
                >
                  <div className="flex @3xl:w-[min(28.75rem,100cqw-2*var(--booker-side))] w-full @3xl:shrink-0 flex-col items-center @3xl:@max-5xl:px-2 px-4 @3xl:@max-5xl:py-2 pt-3 pb-4">
                    <BookerCalendar {...booker.calendarProps} />
                  </div>
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
                </div>
              ) : (
                <div
                  key="confirm"
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
                </div>
              )}
            </BookerSteps>
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
