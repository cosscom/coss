"use client";

import { MapPinIcon } from "lucide-react";
import { useMemo, useState } from "react";

type LocationProps = {
  location: string;
  provider?: string;
};

const PROVIDER_ICON_MAP: Record<string, string> = {
  "integrations:google:meet":
    "https://i.cal.com/app-store/googlevideo/logo.webp",
  "integrations:zoom": "/app-store/zoomvideo/icon.svg",
  "integrations:microsoft:teams": "/app-store/office365video/icon.svg",
  "integrations:whereby": "/app-store/whereby/icon-dark.svg",
  "integrations:jitsi": "/app-store/jitsivideo/icon.svg",
};

function resolveProviderIcon(provider?: string): string {
  if (!provider) {
    return "";
  }

  const normalized = provider.trim().toLowerCase();
  const mapped = PROVIDER_ICON_MAP[normalized] ?? "";
  if (!mapped) {
    return "";
  }

  if (mapped.startsWith("http://") || mapped.startsWith("https://")) {
    return mapped;
  }

  if (mapped.startsWith("/")) {
    return `https://i.cal.com${mapped}`;
  }

  return mapped;
}

export function Location({ location, provider }: LocationProps) {
  const iconUrl = useMemo(() => resolveProviderIcon(provider), [provider]);
  const [failedIconUrl, setFailedIconUrl] = useState<string | null>(null);
  const iconLoadFailed = failedIconUrl === iconUrl;

  return (
    <div className="flex items-center gap-2">
      {iconUrl && !iconLoadFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={`${location} icon`}
          className="size-4.5 sm:size-4"
          onError={() => setFailedIconUrl(iconUrl)}
          src={iconUrl}
        />
      ) : (
        <MapPinIcon className="size-4 shrink-0 opacity-80" aria-hidden="true" />
      )}
      <span>{location}</span>
    </div>
  );
}
