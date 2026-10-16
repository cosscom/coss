"use client";
import { Button } from "@coss/ui/components/button";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { SITE_URL } from "@/lib/site";

/** The one line to hand a coding agent: everything else it reads from the docs. */
export const AGENT_PROMPT = `Add coss.com to this project: read ${SITE_URL}/llms.txt, install the \`coss\` package, and develop with a coss_test_ key.`;

export function CopyPrompt() {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(AGENT_PROMPT);
      setCopied(true);
    } catch {
      // Clipboard access can be refused; the prompt stays selectable.
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-background p-2 ps-4 sm:flex-row sm:items-center">
      <p className="min-w-0 flex-1 font-mono text-[0.8125rem] leading-relaxed">{AGENT_PROMPT}</p>
      <Button aria-live="polite" className="shrink-0 px-4" onClick={copy} variant="outline">
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? "Copied" : "Copy prompt"}
      </Button>
    </div>
  );
}
