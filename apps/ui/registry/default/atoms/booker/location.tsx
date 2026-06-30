"use client";

import { MapPinIcon } from "lucide-react";
import { useMemo, useState } from "react";

type LocationProps = {
  location: string;
  provider?: string;
};

const PROVIDER_ICON_MAP: Record<string, string> = {
  "cal-video": "https://app.cal.com/app-store/dailyvideo/icon.svg",
  "daily-video": "https://app.cal.com/app-store/dailyvideo/icon.svg",
  "google-meet": "https://i.cal.com/app-store/googlevideo/logo.webp",
  "huddle01-video": "/app-store/huddle01video/icon.svg",
  "microsoft-teams": "/app-store/office365video/icon.svg",
  jitsi: "/app-store/jitsivideo/icon.svg",
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

export function Location({ location, provider }: LocationProps) {
  const iconUrls = useMemo(() => resolveProviderIcons(provider), [provider]);
  const [failedIconUrls, setFailedIconUrls] = useState<Set<string>>(
    () => new Set(),
  );
  const iconUrl =
    iconUrls.find((candidate) => !failedIconUrls.has(candidate)) ?? "";

  return (
    <div className="flex items-center gap-2">
      {iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={`${location} icon`}
          className="size-4.5 sm:size-4"
          onError={() =>
            setFailedIconUrls((prev) => new Set(prev).add(iconUrl))
          }
          src={iconUrl}
        />
      ) : (
        <MapPinIcon className="size-4 shrink-0 opacity-80" aria-hidden="true" />
      )}
      <span>{location}</span>
    </div>
  );
}
