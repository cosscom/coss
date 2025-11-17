"use client";

import { useState } from "react";

import { cn } from "@/registry/default/lib/utils";
import { Button } from "@/registry/default/ui/button";

const CopyClass = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div>
      <Button
        aria-label={copied ? "Copied" : "Copy Tailwind class"}
        className="h-7 max-w-full whitespace-normal font-normal text-muted-foreground/80 text-xs hover:bg-transparent hover:text-foreground disabled:opacity-100"
        disabled={copied}
        onClick={handleCopy}
        variant="ghost"
      >
        <div className="flex-1">
          {copied ? (
            "Copied"
          ) : (
            <span className="transition-colors">Copy class</span>
          )}
        </div>
        <div className="relative">
          <div
            className={cn(
              "transition-all",
              copied ? "scale-100 opacity-100" : "scale-0 opacity-0",
            )}
          >
            <svg
              aria-hidden="true"
              fill="none"
              height="16"
              width="16"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M14.548 3.488a.75.75 0 0 1-.036 1.06l-8.572 8a.75.75 0 0 1-1.023 0l-3.429-3.2a.75.75 0 0 1 1.024-1.096l2.917 2.722 8.06-7.522a.75.75 0 0 1 1.06.036Z"
                fill="#10B981"
              />
            </svg>
          </div>
          <div
            className={cn(
              "-top-0.5 absolute transition-all",
              copied ? "scale-0 opacity-0" : "scale-100 opacity-80",
            )}
          >
            <svg
              aria-hidden="true"
              className="fill-current"
              fill="none"
              height="16"
              width="16"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M3 2.5h7a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5ZM10 1H3a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2Zm3 5.5h1a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5H7a.5.5 0 0 1-.5-.5v-1H5v1a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1v1.5Z" />
            </svg>
          </div>
        </div>
      </Button>
    </div>
  );
};

export default CopyClass;
