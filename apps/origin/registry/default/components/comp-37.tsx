"use client";

import { Label } from "react-aria-components";

import { DateInput, TimeField } from "@/registry/default/ui/datefield-rac";

export default function Component() {
  return (
    <TimeField className="*:not-first:mt-2">
      <Label className="font-medium text-foreground text-sm">Time input</Label>
      <DateInput />
      <p
        className="mt-2 text-muted-foreground text-xs"
        role="region"
        aria-live="polite"
      >
        Built with{" "}
        <a
          className="underline hover:text-foreground"
          href="https://react-spectrum.adobe.com/react-aria/DateField.html"
          target="_blank"
          rel="noreferrer noopener nofollow"
        >
          React Aria
        </a>
      </p>
    </TimeField>
  );
}
