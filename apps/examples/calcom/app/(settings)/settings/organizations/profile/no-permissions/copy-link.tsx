"use client";

import { Button } from "@coss/ui/components/button";
import { anchoredToastManager } from "@coss/ui/components/toast";
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import { useCopyToClipboard } from "@coss/ui/hooks/use-copy-to-clipboard";
import { CopyIcon } from "lucide-react";
import { useRef } from "react";

const linkUrl = "https://cal.com/org/cal-com";
const toastTimeout = 2000;

export function CopyLink() {
  const { copyToClipboard, isCopied } = useCopyToClipboard();
  const buttonRef = useRef<HTMLDivElement>(null);
  const toastIdRef = useRef<string | null>(null);

  function handleClick() {
    copyToClipboard(linkUrl);

    if (toastIdRef.current) {
      anchoredToastManager.close(toastIdRef.current);
      toastIdRef.current = null;
    }

    if (buttonRef.current) {
      toastIdRef.current = anchoredToastManager.add({
        data: { tooltipStyle: true },
        positionerProps: {
          anchor: buttonRef.current,
          sideOffset: 4,
        },
        timeout: toastTimeout,
        title: "Copied!",
        type: "success",
      });
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div ref={buttonRef}>
            <Button
              aria-label="Copy link to organization"
              onClick={handleClick}
              size="icon-xs"
              variant="ghost"
            >
              <CopyIcon aria-hidden="true" />
            </Button>
          </div>
        }
      />
      <TooltipPopup>
        <p>{isCopied ? "Copied!" : "Copy link to organization"}</p>
      </TooltipPopup>
    </Tooltip>
  );
}
