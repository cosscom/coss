"use client";

import { ExternalLinkIcon, MapPinIcon } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Popover,
  PopoverDescription,
  PopoverPopup,
  PopoverTrigger,
} from "@/registry/default/ui/popover";
import type { EventTypeLocationOption } from "@/lib/booker/utils";

type LocationLabels = {
  locationOptions: (count: number) => string;
  selectOnNextStep: string;
};

type LocationProps = {
  locations: EventTypeLocationOption[];
  labels: LocationLabels;
};

const PROVIDER_ICON_MAP: Record<string, string> = {
  "cal-video": "https://app.cal.com/app-store/dailyvideo/icon.svg",
  "daily-video": "https://app.cal.com/app-store/dailyvideo/icon.svg",
  "google-meet": "https://i.cal.com/app-store/googlevideo/logo.webp",
  "huddle01-video": "/app-store/huddle01video/icon.svg",
  "microsoft-teams": "/app-store/office365video/icon.svg",
  conferencing: "external-link",
  jitsi: "/app-store/jitsivideo/icon.svg",
  organizersdefaultapp: "external-link",
  whereby: "/app-store/whereby/icon-dark.svg",
  zoom: "/app-store/zoomvideo/icon.svg",
};

function normalizeIconUrl(value: string): string {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("/")) {
    return `https://app.cal.com${value}`;
  }

  return value;
}

function resolveProviderIcons(provider?: string): string[] {
  if (!provider) {
    return [];
  }

  const normalized = provider.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  const appStoreSlugs = new Set<string>([
    normalized,
    normalized.replaceAll("-", ""),
  ]);
  if (normalized.endsWith("-video")) {
    appStoreSlugs.add(normalized.replace(/-video$/, "video"));
  }

  return Array.from(
    new Set([
      PROVIDER_ICON_MAP[normalized],
      ...Array.from(
        appStoreSlugs,
        (slug) => `https://app.cal.com/app-store/${slug}/icon.svg`,
      ),
    ]),
  )
    .filter((url): url is string => Boolean(url))
    .map(normalizeIconUrl);
}

function LocationIcon({
  label,
  provider,
}: {
  label: string;
  provider?: string;
}) {
  const iconUrls = useMemo(() => resolveProviderIcons(provider), [provider]);
  const [failedIconUrls, setFailedIconUrls] = useState<Set<string>>(
    () => new Set(),
  );
  const iconUrl =
    iconUrls.find((candidate) => !failedIconUrls.has(candidate)) ?? "";

  if (iconUrl) {
    if (iconUrl === "external-link") {
      return (
        <ExternalLinkIcon
          className="size-4.5 shrink-0 opacity-80 sm:size-4"
          aria-hidden="true"
        />
      );
    }

    return (
      <img
        alt=""
        aria-hidden="true"
        className="size-4.5 shrink-0 sm:size-4"
        onError={() => setFailedIconUrls((prev) => new Set(prev).add(iconUrl))}
        src={iconUrl}
      />
    );
  }

  return (
    <MapPinIcon
      className="size-4.5 shrink-0 opacity-80 sm:size-4"
      aria-hidden="true"
    />
  );
}

function LocationRow({ label, provider }: EventTypeLocationOption) {
  return (
    <div className="flex items-center gap-2">
      <LocationIcon label={label} provider={provider} />
      <span>{label}</span>
    </div>
  );
}

export function Location({ locations, labels }: LocationProps) {
  if (locations.length <= 1) {
    const location = locations[0];
    return location ? <LocationRow {...location} /> : null;
  }

  return (
    <Popover>
      <PopoverTrigger
        aria-label={labels.locationOptions(locations.length)}
        className="flex w-fit items-center gap-2 decoration-current/32 decoration-dotted underline-offset-2 hover:text-foreground hover:underline"
        openOnHover
        delay={0}
      >
        <MapPinIcon className="size-4.5 shrink-0 opacity-80 sm:size-4" />
        <span>{labels.locationOptions(locations.length)}</span>
      </PopoverTrigger>
      <PopoverPopup align="start" side="top" className="*:p-3">
        <PopoverDescription className="mb-2 font-medium text-muted-foreground text-xs">
          {labels.selectOnNextStep}
        </PopoverDescription>
        <ul className="flex flex-col gap-2">
          {locations.map((location, index) => (
            <li
              className="flex items-center gap-2 font-medium text-xs"
              key={`${location.label}-${location.provider}-${index}`}
            >
              <LocationIcon
                label={location.label}
                provider={location.provider}
              />
              <span>{location.label}</span>
            </li>
          ))}
        </ul>
      </PopoverPopup>
    </Popover>
  );
}
