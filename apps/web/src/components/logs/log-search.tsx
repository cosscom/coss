"use client";

import { LOG_QUERY_SUGGESTIONS } from "@coss/logs/query";
import { Kbd } from "@coss/ui/components/kbd";
import { SearchIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * The search box: free text plus `key:value` filters. Suggests keys while typing one, applies on
 * Enter, and `/` focuses it from anywhere on the page.
 */
export function LogSearch(props: { value: string; onSubmit: (q: string) => void }) {
  const [value, setValue] = useState(props.value);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setValue(props.value), [props.value]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target?.closest("input, textarea, select, [contenteditable=true]");
      if (event.key === "/" && !typing) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The token being typed: suggest keys while it has no `:` yet.
  const token = /(?:^|\s)(-?[a-z]*)$/i.exec(value)?.[1] ?? "";
  const prefix = token.replace(/^-/, "").toLowerCase();
  const suggestions =
    focused && !token.includes(":")
      ? LOG_QUERY_SUGGESTIONS.filter(({ key }) => key.startsWith(prefix)).slice(0, 8)
      : [];
  const open = suggestions.length > 0 && (prefix.length > 0 || value.trim() === "");

  function complete(key: string) {
    const negated = token.startsWith("-") ? "-" : "";
    setValue(`${value.slice(0, value.length - token.length)}${negated}${key}:`);
    setActive(0);
    inputRef.current?.focus();
  }

  return (
    <div className="relative min-w-0 flex-1">
      <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        aria-label="Search logs"
        autoComplete="off"
        className="h-9 w-full rounded-lg sm:h-8 border border-input bg-background ps-9 pe-16 font-mono text-sm shadow-xs/5 outline-none ring-ring/24 transition-shadow placeholder:font-sans focus-visible:border-ring focus-visible:ring-[3px] dark:bg-input/32"
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        onChange={(event) => {
          setValue(event.target.value);
          setActive(0);
        }}
        onFocus={() => setFocused(true)}
        onKeyDown={(event) => {
          if (open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault();
            const step = event.key === "ArrowDown" ? 1 : -1;
            setActive((current) => (current + step + suggestions.length) % suggestions.length);
          } else if (open && event.key === "Tab") {
            const suggestion = suggestions[active];
            if (suggestion) {
              event.preventDefault();
              complete(suggestion.key);
            }
          } else if (event.key === "Enter") {
            event.preventDefault();
            props.onSubmit(value);
            inputRef.current?.blur();
          } else if (event.key === "Escape") {
            setValue(props.value);
            inputRef.current?.blur();
          }
        }}
        placeholder="Search logs… (status:5xx method:POST level:error, or any text)"
        ref={inputRef}
        spellCheck={false}
        value={value}
      />
      <div className="absolute end-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {value ? (
          <button
            aria-label="Clear search"
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => {
              setValue("");
              props.onSubmit("");
            }}
            type="button"
          >
            <XIcon className="size-3.5" />
          </button>
        ) : (
          <Kbd>/</Kbd>
        )}
      </div>
      {open ? (
        <div
          className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg"
          role="listbox"
        >
          {suggestions.map((suggestion, index) => (
            <button
              aria-selected={index === active}
              className={`flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm ${index === active ? "bg-accent" : ""}`}
              key={suggestion.key}
              onMouseDown={(event) => {
                event.preventDefault();
                complete(suggestion.key);
              }}
              role="option"
              type="button"
            >
              <code className="font-mono">{suggestion.key}:</code>
              <span className="truncate text-muted-foreground text-xs">{suggestion.hint}</span>
            </button>
          ))}
          <p className="border-t px-2 pt-1.5 pb-1 text-muted-foreground text-xs">
            Tab completes · repeat a key to match any value · <code>-key:value</code> excludes
          </p>
        </div>
      ) : null}
    </div>
  );
}
