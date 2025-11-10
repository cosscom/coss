"use client"

import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/registry/default/ui/select"

const items = [
  { label: "Next.js", value: "next", description: "npx create-next-app" },
  { label: "Vite", value: "vite", description: "npm create vite@latest" },
  { label: "Astro", value: "astro", description: "npm create astro@latest" },
  { label: "Remix", value: "remix", description: "npx create-remix" },
]

export default function SelectWithObjectValues() {
  return (
    <Select
      defaultValue={items[0]}
      itemToStringValue={(item) => item.value}
      aria-label="Select framework with command"
    >
      <SelectTrigger>
        <SelectValue>
          {(item) => (
            <span className="flex flex-col">
              <span className="truncate">{item.label}</span>
              <span className="truncate text-xs text-muted-foreground">
                {item.description}
              </span>
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectPopup>
        {items.map((item) => (
          <SelectItem key={item.value} value={item}>
            <span className="flex flex-col">
              <span className="truncate">{item.label}</span>
              <span className="truncate text-xs text-muted-foreground">
                {item.description}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  )
}
