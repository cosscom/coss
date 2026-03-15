"use client";

import { Card, CardPanel } from "@coss/ui/components/card";
import { Tabs, TabsList, TabsTab } from "@coss/ui/components/tabs";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Clock3Icon,
  GlobeIcon,
  MapPinIcon,
  StarIcon,
} from "lucide-react";
import type { ReactElement, ReactNode } from "react";

const timeSlots = ["15m", "30m", "45m", "1h"];

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const calendarDays = [
  ["", "", "", "", "1", "2", "3"],
  ["4", "5", "6", "7", "8", "9", "10"],
  ["11", "12", "13", "14", "15", "16", "17"],
  ["18", "19", "20", "21", "22", "23", "24"],
  ["25", "26", "27", "28", "29", "30", "31"],
];

const softSelectedDays = new Set([
  "1",
  "2",
  "3",
  "6",
  "8",
  "9",
  "16",
  "17",
  "21",
  "22",
  "24",
  "27",
  "28",
  "29",
]);

const dotDays = new Set(["15", "31"]);

function TrustpilotReview(): ReactElement {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <span className="text-lg leading-none">★</span>
        <span className="font-medium text-sm">Trustpilot</span>
      </div>
      <div className="flex items-center gap-0.5">
        {["tp-1", "tp-2", "tp-3", "tp-4", "tp-5"].map((id, index) => (
          <div
            className={[
              "flex size-4 items-center justify-center text-sm leading-none",
              index === 4
                ? "bg-linear-to-r from-50% from-emerald-500 to-50% to-input text-white"
                : "bg-emerald-500 text-white",
            ].join(" ")}
            key={id}
          >
            ★
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductHuntReview(): ReactElement {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        <div className="flex size-5 items-center justify-center rounded-full bg-[#ff6154] font-semibold text-sm text-white">
          P
        </div>
      </div>
      <div className="flex items-center gap-0.5 text-amber-500 leading-none">
        {["ph-1", "ph-2", "ph-3", "ph-4", "ph-5"].map((id) => (
          <StarIcon className="size-3.5 fill-current stroke-current" key={id} />
        ))}
      </div>
    </div>
  );
}

function G2Review(): ReactElement {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        <div className="flex size-5 items-center justify-center rounded-full bg-[#ff6154] font-semibold text-white text-xs">
          G2
        </div>
      </div>
      <div className="flex items-center gap-0.5 text-[#ff4a3d] leading-none">
        {["g2-1", "g2-2", "g2-3", "g2-4", "g2-5"].map((id, index) => (
          <StarIcon
            className={
              index === 4
                ? "size-3.5 bg-linear-to-r from-50% from-[#ff4a3d] to-50% to-white bg-clip-text fill-current stroke-current text-transparent"
                : "size-3.5 fill-current stroke-current"
            }
            key={id}
          />
        ))}
      </div>
    </div>
  );
}

function HeroReviewStrip(): ReactElement {
  return (
    <div className="mt-8 flex gap-10 px-0">
      <TrustpilotReview />
      <ProductHuntReview />
      <G2Review />
    </div>
  );
}

function BookingMetaRow({
  children,
  icon,
  trailing,
}: {
  children: ReactNode;
  icon: ReactNode;
  trailing?: ReactNode;
}): ReactElement {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="font-medium">{children}</span>
      {trailing}
    </div>
  );
}

function BookingDurationTabs(): ReactElement {
  return (
    <div className="mt-8 flex items-center gap-2">
      <Clock3Icon className="size-4 opacity-80" />
      <Tabs className="gap-0" defaultValue="15m">
        <TabsList className="rounded-xl bg-muted p-1 *:data-[slot=tab-indicator]:rounded-lg *:data-[slot=tab-indicator]:bg-background *:data-[slot=tab-indicator]:shadow-xs">
          {timeSlots.map((slot) => (
            <TabsTab
              className="h-auto min-w-[54px] rounded-lg px-3 py-1.5 font-medium text-[15px] text-muted-foreground shadow-none data-active:text-foreground"
              key={slot}
              value={slot}
            >
              {slot}
            </TabsTab>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}

function BookingInfoPanel(): ReactElement {
  return (
    <div className="border-r p-5">
      <div className="flex items-center gap-3">
        <img
          alt="Cédric van Ravesteijn"
          className="size-6 rounded-full object-cover"
          src="https://framerusercontent.com/images/1bvk9THj74PqBkpBJDHFbQS9om4.png"
        />
        <p className="font-medium text-muted-foreground text-sm">
          Cédric van Ravesteijn
        </p>
      </div>

      <div className="mt-3">
        <h3 className="font-semibold text-foreground text-xl">
          Partnerships Meeting
        </h3>
        <p className="mt-1 text-muted-foreground text-sm">
          Are you an agency, influencer, SaaS founder, or business looking to
          collaborate with Cal.com? Let&apos;s chat!
        </p>
      </div>

      <BookingDurationTabs />

      <div className="mt-8 flex flex-col gap-4 text-foreground text-sm">
        <BookingMetaRow icon={<MapPinIcon className="size-4 opacity-80" />}>
          Cal Video
        </BookingMetaRow>
        <BookingMetaRow
          icon={<GlobeIcon className="size-4 opacity-80" />}
          trailing={<ChevronDownIcon className="size-4 opacity-80" />}
        >
          Europe/Amsterdam
        </BookingMetaRow>
      </div>
    </div>
  );
}

function BookingCalendar(): ReactElement {
  return (
    <div className="p-5">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-foreground">
          May <span className="font-normal text-muted-foreground">2025</span>
        </p>
        <div className="flex items-center gap-3">
          <ChevronLeftIcon className="size-4 opacity-80" />
          <ChevronRightIcon className="size-4 opacity-80" />
        </div>
      </div>

      <div className="mt-5 grid w-max grid-cols-7 gap-1 gap-y-5 text-center font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {weekdays.map((day) => (
          <div className="w-13" key={day}>
            {day}
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-1">
        {calendarDays.map((week) => (
          <div className="grid w-max grid-cols-7 gap-1" key={week.join("-")}>
            {week.map((day, dayIndex) => {
              const isEmpty = day === "";
              const isSelected = day === "7";
              const isSoftSelected = softSelectedDays.has(day);
              const hasDot = dotDays.has(day);

              return (
                <div
                  className={[
                    "relative flex size-13 items-center justify-center rounded-sm font-medium text-sm",
                    isEmpty && "opacity-0",
                    isSelected && "bg-foreground text-background",
                    isSoftSelected && "bg-input text-foreground",
                    !isSelected &&
                      !isSoftSelected &&
                      !isEmpty &&
                      "text-muted-foreground",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={day || `empty-${week.join("-")}-${dayIndex}`}
                >
                  {day || "0"}
                  {hasDot ? (
                    <span className="absolute bottom-2 left-1/2 size-1 -translate-x-1/2 rounded-full bg-foreground" />
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SchedulingPreview(): ReactElement {
  return (
    <div>
      <Card className="w-fit border-sidebar-border shadow-lg/5">
        <CardPanel className="p-0">
          <div className="grid w-max grid-cols-[300px_max-content]">
            <BookingInfoPanel />
            <BookingCalendar />
          </div>
        </CardPanel>
      </Card>

      <HeroReviewStrip />
    </div>
  );
}
