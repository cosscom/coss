import { FilterIcon, XIcon } from "lucide-react"

import { Button } from "@/registry/default/ui/button"
import { Group, GroupItem, GroupSeparator } from "@/registry/default/ui/group"
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/registry/default/ui/select"

const statusItems = [
  { label: "All Status", value: "all" },
  { label: "Active", value: "active" },
  { label: "Pending", value: "pending" },
  { label: "Archived", value: "archived" },
]

const categoryItems = [
  { label: "All Categories", value: "all" },
  { label: "Design", value: "design" },
  { label: "Development", value: "development" },
  { label: "Marketing", value: "marketing" },
]

export default function GroupVerticalWithDropdown() {
  return (
    <Group orientation="vertical">
      <GroupItem
        render={
          <Select items={statusItems} defaultValue="all">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {statusItems.map(({ label, value }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        }
      />
      <GroupSeparator />
      <GroupItem
        render={
          <Select items={categoryItems} defaultValue="all">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {categoryItems.map(({ label, value }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        }
      />
      <GroupSeparator />
      <GroupItem
        render={<Button variant="destructive-outline">Delete</Button>}
      />
    </Group>
  )
}
