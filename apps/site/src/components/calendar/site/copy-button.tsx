"use client";

import { Button, type ButtonProps } from "@coss/ui/components/button";
import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type CopyButtonProps = Omit<ButtonProps, "children" | "onClick"> & {
  text: string | (() => string);
  label?: string;
  showLabel?: boolean;
};

export function CopyButton({
  text,
  label = "Copy",
  showLabel = false,
  size,
  variant = "ghost",
  ...props
}: CopyButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    let next: "copied" | "failed" = "copied";
    try {
      await navigator.clipboard.writeText(typeof text === "function" ? text() : text);
    } catch {
      next = "failed";
    }
    setState(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 1600);
  };

  const copied = state === "copied";
  return (
    <>
      <Button
        size={size ?? (showLabel ? "sm" : "icon-sm")}
        variant={variant}
        aria-label={showLabel ? undefined : copied ? "Copied" : label}
        data-copied={copied || undefined}
        onClick={copy}
        {...props}
      >
        {copied ? <Check aria-hidden className="text-success" /> : <Copy aria-hidden />}
        {showLabel && (copied ? "Copied" : label)}
      </Button>
      <span role="status" className="sr-only">
        {copied ? "Copied to clipboard" : state === "failed" ? "Copy failed" : ""}
      </span>
    </>
  );
}
