"use client";

import { ListBox, ListBoxItem } from "react-aria-components";

import { Label } from "@/registry/default/ui/label";

export default function Component() {
  return (
    <div className="*:not-first:mt-2">
      <Label>Listbox with single option</Label>
      <div className="overflow-hidden rounded-md border border-input">
        <ListBox
          className="space-y-1 bg-background p-1 text-sm shadow-xs transition-[color,box-shadow]"
          aria-label="Select framework"
          selectionMode="single"
          defaultSelectedKeys={["svelte"]}
        >
          <ListBoxItem
            id="react"
            className="relative rounded px-2 py-1.5 outline-none data-disabled:cursor-not-allowed data-focus-visible:border-ring data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-disabled:opacity-50 data-focus-visible:ring-[3px] data-focus-visible:ring-ring/50"
          >
            React
          </ListBoxItem>
          <ListBoxItem
            id="vue"
            className="relative rounded px-2 py-1.5 outline-none data-disabled:cursor-not-allowed data-focus-visible:border-ring data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-disabled:opacity-50 data-focus-visible:ring-[3px] data-focus-visible:ring-ring/50"
          >
            Vue
          </ListBoxItem>
          <ListBoxItem
            id="angular"
            className="relative rounded px-2 py-1.5 outline-none data-disabled:cursor-not-allowed data-focus-visible:border-ring data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-disabled:opacity-50 data-focus-visible:ring-[3px] data-focus-visible:ring-ring/50"
            isDisabled
          >
            Angular
          </ListBoxItem>
          <ListBoxItem
            id="svelte"
            className="relative rounded px-2 py-1.5 outline-none data-disabled:cursor-not-allowed data-focus-visible:border-ring data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-disabled:opacity-50 data-focus-visible:ring-[3px] data-focus-visible:ring-ring/50"
          >
            Svelte
          </ListBoxItem>
        </ListBox>
      </div>
      <p
        className="mt-2 text-muted-foreground text-xs"
        role="region"
        aria-live="polite"
      >
        Built with{" "}
        <a
          className="underline hover:text-foreground"
          href="https://react-spectrum.adobe.com/react-aria/ListBox.html"
          target="_blank"
          rel="noreferrer noopener nofollow"
        >
          React Aria
        </a>
      </p>
    </div>
  );
}
