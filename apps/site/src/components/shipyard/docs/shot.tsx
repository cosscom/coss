import type { ReactNode } from "react";
import { SHIPYARD } from "@/lib/shipyard";
import sizes from "./shots.json";

// A screenshot of the app, light and dark: public/shipyard/shots/<name>-light.webp
// and <name>-dark.webp, with each one's size in CSS pixels in
// shots.json. The page keeps that room before the picture loads, shows
// the one for the site's theme, and a click opens it full size. A shot is
// never wider than it was taken.
//
//   <Shot name="themes" alt="Settings → Appearance: the theme cards" />
//   <Shot name="tab-groups" alt="…" caption="What it shows, in a sentence." />

export type ShotName = keyof typeof sizes;

export function Shot({ name, alt, caption }: { name: ShotName; alt: string; caption?: ReactNode }) {
  const size = sizes[name];
  if (!size) throw new Error(`No shot named "${name}"`);
  const img = (theme: "light" | "dark") => {
    const src = `${SHIPYARD.path}/shots/${name}-${theme}.webp`;
    return (
      <span className={`berth-shot-${theme}`}>
        <a href={src} rel="noreferrer" target="_blank">
          <img
            alt={alt}
            decoding="async"
            height={size.height}
            loading="lazy"
            src={src}
            width={size.width}
          />
        </a>
      </span>
    );
  };
  return (
    <figure className="berth-shot" style={{ maxWidth: size.width }}>
      {img("light")}
      {img("dark")}
      {caption && <figcaption className="berth-shot-caption">{caption}</figcaption>}
    </figure>
  );
}
