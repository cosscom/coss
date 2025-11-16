"use client"

import { Code2Icon, GlobeIcon, LayersIcon, ZapIcon } from "lucide-react"

import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/registry/default/ui/select"

const items = [
  { label: "Components", value: "components", icon: LayersIcon },
  { label: "Performance", value: "performance", icon: ZapIcon },
  { label: "Network", value: "network", icon: GlobeIcon },
  { label: "Development", value: "development", icon: Code2Icon },
]

export default function SelectOptionsWithIcon() {
  return (
    <Select
      defaultValue={items[0]}
      itemToStringValue={(item) => item.value}
      aria-label="Select category"
    >
      <SelectTrigger>
        <SelectValue>
          {(item) => (
            <span className="flex items-center gap-2">
              <item.icon className="size-4 opacity-72" />
              <span className="truncate">{item.label}</span>
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectPopup>
        {items.map((item) => (
          <SelectItem key={item.value} value={item}>
            <span className="flex items-center gap-2">
              <item.icon className="size-4 opacity-72" />
              <span className="truncate">{item.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  )
}
