"use client";

import { PlayIcon } from "lucide-react";
import { useState } from "react";

/**
 * A click-to-play YouTube video: only the poster (served by the hub, public/video) loads with the
 * page; the player (youtube-nocookie.com, privacy-enhanced mode) is framed once the visitor
 * presses play (`src/lib/security-headers.ts` allows that one frame origin).
 */
export function YouTubeEmbed({ id, title, poster }: { id: string; title: string; poster: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-muted">
      {playing ? (
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 size-full"
          referrerPolicy="strict-origin-when-cross-origin"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
        />
      ) : (
        <button
          aria-label={`Play video: ${title}`}
          className="group absolute inset-0 size-full cursor-pointer focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-4"
          onClick={() => setPlaying(true)}
          type="button"
        >
          {/* sddefault (640×480, letterboxed; cropped by object-cover): this video has no maxresdefault. */}
          {/* biome-ignore lint/performance/noImgElement: see above */}
          <img
            alt=""
            className="absolute inset-0 size-full object-cover grayscale transition-[filter] duration-300 group-hover:grayscale-0"
            decoding="async"
            loading="lazy"
            src={poster}
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-16 items-center justify-center rounded-full border bg-background/90 shadow-sm backdrop-blur-sm transition-transform group-hover:scale-105 sm:size-20">
              <PlayIcon aria-hidden className="ml-1 size-6 fill-current sm:size-7" />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
