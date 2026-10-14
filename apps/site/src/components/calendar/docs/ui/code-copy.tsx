"use client";

import { useRef } from "react";
import { CopyButton, type CopyButtonProps } from "@/components/calendar/site/copy-button";

/** Copies the text of the `<pre>` in the enclosing `<figure>`. */
export function CodeCopy(props: Omit<CopyButtonProps, "text">) {
  const anchor = useRef<HTMLSpanElement>(null);
  return (
    <>
      <span ref={anchor} hidden />
      <CopyButton
        size="icon-xs"
        label="Copy code"
        {...props}
        text={() => anchor.current?.closest("figure")?.querySelector("pre")?.textContent ?? ""}
      />
    </>
  );
}
