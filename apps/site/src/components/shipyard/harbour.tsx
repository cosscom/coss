import { cn } from "@coss/ui/lib/utils";
import { SHIPYARD } from "@/lib/shipyard";

const base = `${SHIPYARD.path}/assets`;
const art = "absolute inset-0 h-full w-full object-cover object-[50%_42%]";

/**
 * Shipyard's harbour, as on its landing page's hero, for a banner elsewhere (the coss.com landing
 * page): the painting by day; at night (dark mode) the film's loop over the night painting, which
 * stays for reduced motion. Decorative, and fading into whatever sits below it.
 */
export function ShipyardHarbour({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden [mask-image:linear-gradient(black_55%,transparent)]",
        className,
      )}
    >
      <img
        alt=""
        className={cn(art, "dark:hidden")}
        decoding="async"
        height={941}
        loading="lazy"
        src={`${base}/harbour/day.webp`}
        width={1672}
      />
      <img
        alt=""
        className={cn(art, "hidden dark:block")}
        decoding="async"
        height={941}
        loading="lazy"
        src={`${base}/harbour/night.webp`}
        width={1672}
      />
      <video
        autoPlay
        className={cn(art, "hidden dark:block motion-reduce:hidden")}
        loop
        muted
        playsInline
        poster={`${base}/film/hero-loop-poster.webp`}
        preload="none"
      >
        <source src={`${base}/film/hero-loop.webm`} type="video/webm" />
        <source src={`${base}/film/hero-loop.mp4`} type="video/mp4" />
      </video>
    </div>
  );
}
