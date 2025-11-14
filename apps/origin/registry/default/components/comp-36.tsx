"use client";

import { Label } from "react-aria-components";

import { DateField, DateInput } from "@/registry/default/ui/datefield-rac";

export default function Component() {
  return (
    <DateField className="*:not-first:mt-2">
      <Label className="font-medium text-foreground text-sm">Date input</Label>
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
    </DateField>
  );
}
