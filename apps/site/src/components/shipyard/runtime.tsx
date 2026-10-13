"use client";

import { useEffect } from "react";

/**
 * What moves on Shipyard's landing page, in the order it mattered at berthd.app: the harbour is
 * drawn as soon as the page is up (public/shipyard/assets/harbour.js); the night loop, the
 * chapters' loops and their line scenes come after the page has loaded and the harbour has been
 * drawn, when the main thread is idle (hero-loop.js, clips.js, scenes.css), so nothing of them
 * stands between the hero and its first paint. The install line's copy button is here too. The
 * scripts find their elements when they run, so each visit to the page runs them afresh.
 */
export function LandingRuntime({ base }: { base: string }) {
  // The scripts draw the harbour by the site's theme (the `dark` class next-themes puts on <html>,
  // from the header's switch or the system) and redraw on a `berth:theme` event.
  useEffect(() => {
    const root = document.documentElement;
    let dark = root.classList.contains("dark");
    const observer = new MutationObserver(() => {
      const now = root.classList.contains("dark");
      if (now === dark) return;
      dark = now;
      dispatchEvent(new Event("berth:theme"));
    });
    observer.observe(root, { attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".shipyard-landing");
    if (!root) return;
    const stamp = Date.now();
    const added: HTMLElement[] = [];
    const script = (name: string) => {
      const s = document.createElement("script");
      s.src = `${base}/assets/${name}?v=${stamp}`;
      s.async = false;
      document.head.append(s);
      added.push(s);
    };
    const later = () => {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = `${base}/assets/scenes.css`;
      document.head.append(css);
      added.push(css);
      script("hero-loop.js");
      script("clips.js");
    };
    let once = false;
    const go = () => {
      if (once) return;
      once = true;
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          "requestIdleCallback" in window
            ? requestIdleCallback(later, { timeout: 2000 })
            : setTimeout(later, 300),
        ),
      );
    };
    const band = root.querySelector(".hero [data-harbour]");
    const fallback = setTimeout(go, 2500);
    const afterLoad = () => {
      if (!band || band.classList.contains("drawn")) return go();
      band.addEventListener("harbour:drawn", go, { once: true });
    };
    script("harbour.js");
    if (document.readyState === "complete") afterLoad();
    else addEventListener("load", afterLoad, { once: true });

    // The beam and the boxes' lights rest while the tab is hidden.
    const visibility = () => root.toggleAttribute("data-page-hidden", document.hidden);
    document.addEventListener("visibilitychange", visibility);

    // Copy for the install line. It's there from the start, so the line never moves; without a
    // clipboard (an insecure context) it goes.
    const copies = root.querySelectorAll<HTMLButtonElement>("[data-copy]");
    const onCopy = async (e: Event) => {
      const b = e.currentTarget as HTMLButtonElement;
      try {
        await navigator.clipboard.writeText(
          document.getElementById(b.dataset.copy ?? "")?.textContent ?? "",
        );
        b.textContent = "Copied";
      } catch {
        b.textContent = "Copy failed";
      }
      setTimeout(() => {
        b.textContent = "Copy";
      }, 1600);
    };
    for (const b of copies) {
      if (!navigator.clipboard) b.hidden = true;
      else b.addEventListener("click", onCopy);
    }

    return () => {
      clearTimeout(fallback);
      removeEventListener("load", afterLoad);
      band?.removeEventListener("harbour:drawn", go);
      document.removeEventListener("visibilitychange", visibility);
      for (const b of copies) b.removeEventListener("click", onCopy);
      for (const el of added) el.remove();
    };
  }, [base]);

  return null;
}
