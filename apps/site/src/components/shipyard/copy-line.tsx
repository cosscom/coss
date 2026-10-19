"use client";
import { Button } from "@coss/ui/components/button";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useState } from "react";

/** A command to run, with a button that copies it. */
export function CopyLine({ label, command }: { label: string; command: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
    } catch {
      // Clipboard access can be refused; the line stays selectable.
    }
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-6 sm:px-8">
      <span className="w-28 shrink-0 font-mono text-muted-foreground text-xs">{label}</span>
      <code className="min-w-0 flex-1 break-all font-mono text-[0.9375rem]">{command}</code>
      <Button
        aria-live="polite"
        className="shrink-0 self-start px-3 sm:self-auto"
        onClick={copy}
        size="sm"
        variant="outline"
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
