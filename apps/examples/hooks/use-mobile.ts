import * as React from "react";

const MOBILE_BREAKPOINT = 768; // Tailwind md breakpoint
const LG_BREAKPOINT = 1024; // Tailwind lg breakpoint

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

export function useIsBetweenMdAndLg() {
  const [isBetween, setIsBetween] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(
      `(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${LG_BREAKPOINT - 1}px)`,
    );
    const onChange = () => {
      setIsBetween(
        window.innerWidth >= MOBILE_BREAKPOINT &&
          window.innerWidth < LG_BREAKPOINT,
      );
    };
    mql.addEventListener("change", onChange);
    setIsBetween(
      window.innerWidth >= MOBILE_BREAKPOINT && window.innerWidth < LG_BREAKPOINT,
    );
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isBetween;
}
