"use client";

import { Button } from "@coss/ui/components/button";
import { useCopyToClipboard } from "@coss/ui/hooks/use-copy-to-clipboard";
import { CheckIcon, LinkIcon } from "lucide-react";

export function CopyLinkButton() {
  const { copyToClipboard, isCopied } = useCopyToClipboard();

  return (
    <Button
      onClick={() => copyToClipboard("https://cal.com/org/cal-com")}
      variant="ghost"
    >
      {isCopied ? <CheckIcon /> : <LinkIcon />}
      {isCopied ? "Copied!" : "Copy link to organization"}
    </Button>
  );
}
