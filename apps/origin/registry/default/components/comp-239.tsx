"use client";

import {
  Header,
  ListBox,
  ListBoxItem,
  ListBoxSection,
  Separator,
} from "react-aria-components";

import { Label } from "@/registry/default/ui/label";

export default function Component() {
  return (
    <div className="*:not-first:mt-2">
      <Label>Listbox with option groups</Label>
      <div className="overflow-hidden rounded-md border border-input">
        <ListBox
          className="max-h-72 min-h-20 space-y-2 overflow-auto bg-background p-1 text-sm shadow-xs transition-[color,box-shadow]"
          aria-label="Select some foods"
          selectionMode="multiple"
          defaultSelectedKeys={["lettuce", "tuna"]}
        >
          <ListBoxSection className="space-y-1">
            <Header className="px-2 py-1.5 font-medium text-muted-foreground text-xs">
              Veggies
            </Header>
            <ListBoxItem
              id="lettuce"
              className="relative rounded px-2 py-1.5 outline-none data-disabled:cursor-not-allowed data-focus-visible:border-ring data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-disabled:opacity-50 data-focus-visible:ring-[3px] data-focus-visible:ring-ring/50"
            >
              Lettuce
            </ListBoxItem>
            <ListBoxItem
              id="tomato"
              className="relative rounded px-2 py-1.5 outline-none data-disabled:cursor-not-allowed data-focus-visible:border-ring data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-disabled:opacity-50 data-focus-visible:ring-[3px] data-focus-visible:ring-ring/50"
            >
              Tomato
            </ListBoxItem>
            <ListBoxItem
              id="onion"
              className="relative rounded px-2 py-1.5 outline-none data-disabled:cursor-not-allowed data-focus-visible:border-ring data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-disabled:opacity-50 data-focus-visible:ring-[3px] data-focus-visible:ring-ring/50"
            >
              Onion
            </ListBoxItem>
          </ListBoxSection>
          <Separator className="-mx-1 my-2 h-px bg-border" />
          <ListBoxSection className="space-y-1">
            <Header className="px-2 py-1.5 font-medium text-muted-foreground text-xs">
              Protein
            </Header>
            <ListBoxItem
              id="ham"
              className="relative rounded px-2 py-1.5 outline-none data-disabled:cursor-not-allowed data-focus-visible:border-ring data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-disabled:opacity-50 data-focus-visible:ring-[3px] data-focus-visible:ring-ring/50"
            >
              Ham
            </ListBoxItem>
            <ListBoxItem
              id="tuna"
              className="relative rounded px-2 py-1.5 outline-none data-disabled:cursor-not-allowed data-focus-visible:border-ring data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-disabled:opacity-50 data-focus-visible:ring-[3px] data-focus-visible:ring-ring/50"
            >
              Tuna
            </ListBoxItem>
            <ListBoxItem
              id="tofu"
              className="relative rounded px-2 py-1.5 outline-none data-disabled:cursor-not-allowed data-focus-visible:border-ring data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-disabled:opacity-50 data-focus-visible:ring-[3px] data-focus-visible:ring-ring/50"
            >
              Tofu
            </ListBoxItem>
          </ListBoxSection>
          <Separator className="-mx-1 my-2 h-px bg-border" />
          <ListBoxSection className="space-y-1">
            <Header className="px-2 py-1.5 font-medium text-muted-foreground text-xs">
              Condiments
            </Header>
            <ListBoxItem
              id="mayo"
              className="relative rounded px-2 py-1.5 outline-none data-disabled:cursor-not-allowed data-focus-visible:border-ring data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-disabled:opacity-50 data-focus-visible:ring-[3px] data-focus-visible:ring-ring/50"
            >
              Mayonaise
            </ListBoxItem>
            <ListBoxItem
              id="mustard"
              className="relative rounded px-2 py-1.5 outline-none data-disabled:cursor-not-allowed data-focus-visible:border-ring data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-disabled:opacity-50 data-focus-visible:ring-[3px] data-focus-visible:ring-ring/50"
            >
              Mustard
            </ListBoxItem>
            <ListBoxItem
              id="ranch"
              className="relative rounded px-2 py-1.5 outline-none data-disabled:cursor-not-allowed data-focus-visible:border-ring data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-disabled:opacity-50 data-focus-visible:ring-[3px] data-focus-visible:ring-ring/50"
            >
              Ranch
            </ListBoxItem>
          </ListBoxSection>
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
