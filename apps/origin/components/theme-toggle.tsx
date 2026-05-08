"use client";

import { RiMoonClearLine, RiSunLine } from "@remixicon/react";
import { useTheme } from "next-themes";
import { useId, useState } from "react";

export default function ThemeToggle() {
  const id = useId();
  const { theme, setTheme } = useTheme();
  const [system, setSystem] = useState(false);

  const smartToggle = () => {
    /* The smart toggle by @nrjdalal */
    const prefersDarkScheme = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    if (theme === "system") {
      setTheme(prefersDarkScheme ? "light" : "dark");
      setSystem(false);
    } else if (
      (theme === "light" && !prefersDarkScheme) ||
      (theme === "dark" && prefersDarkScheme)
    ) {
      setTheme(theme === "light" ? "dark" : "light");
      setSystem(false);
    } else {
      setTheme("system");
      setSystem(true);
    }
  };

  return (
    <div className="flex flex-col justify-center">
      <input
        aria-label="Toggle dark mode"
        checked={system}
        className="peer sr-only"
        id={id}
        name="theme-toggle"
        onChange={smartToggle}
        type="checkbox"
      />
      <label
        aria-hidden="true"
        className="relative inline-flex size-9 cursor-pointer items-center justify-center rounded text-muted-foreground outline-none transition-[color,box-shadow] hover:text-foreground/80 peer-focus-visible:border-ring peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50"
        htmlFor={id}
      >
        <RiSunLine aria-hidden="true" className="dark:hidden" size={20} />
        <RiMoonClearLine
          aria-hidden="true"
          className="hidden dark:block"
          size={20}
        />
        <span className="sr-only">Switch to system/light/dark version</span>
      </label>
    </div>
  );
}
