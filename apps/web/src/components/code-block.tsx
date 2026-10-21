"use client";

import { Button } from "@coss/ui/components/button";
import { cn } from "@coss/ui/lib/utils";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";

export type CodeSample = { label: string; code: string };

/**
 * Code in a window like coss.com's terminal: a title bar with the samples as tabs (curl, SDK…)
 * and a copy button, then the selected sample in mono.
 */
export function CodeBlock(props: { samples: CodeSample[]; className?: string }) {
  const [selected, setSelected] = useState(0);
  const [copied, setCopied] = useState(false);
  const sample = props.samples[selected] ?? props.samples[0];
  if (!sample) return null;

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-background", props.className)}>
      <div className="flex items-center gap-1 border-b py-1.5 ps-3.5 pe-1.5">
        <div aria-hidden className="me-2 flex gap-1.5">
          <span className="size-2.5 rounded-full border" />
          <span className="size-2.5 rounded-full border" />
          <span className="size-2.5 rounded-full border" />
        </div>
        <div className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto" role="tablist">
          {props.samples.map((item, index) => (
            <button
              aria-selected={index === selected}
              className={cn(
                "shrink-0 rounded-md px-2 py-1 font-mono text-xs transition-colors",
                index === selected
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              key={item.label}
              onClick={() => setSelected(index)}
              role="tab"
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
        <Button
          aria-label="Copy"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(sample.code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            } catch {
              // Clipboard access needs a secure context; the code stays selectable.
            }
          }}
          size="icon-sm"
          variant="ghost"
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </Button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[0.8125rem] leading-relaxed">
        {sample.code}
      </pre>
    </div>
  );
}
