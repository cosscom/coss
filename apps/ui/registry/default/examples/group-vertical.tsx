import { EllipsisIcon, FilesIcon, FilmIcon } from "lucide-react"

import { Button } from "@/registry/default/ui/button"
import { Group, GroupItem, GroupSeparator } from "@/registry/default/ui/group"

export default function GroupVertical() {
  return (
    <Group orientation="vertical">
      <GroupItem
        render={<Button variant="outline" size="icon" aria-label="Files" />}
      >
        <FilesIcon />
      </GroupItem>
      <GroupSeparator orientation="horizontal" />
      <GroupItem
        render={<Button variant="outline" size="icon" aria-label="Media" />}
      >
        <FilmIcon />
      </GroupItem>
      <GroupSeparator orientation="horizontal" />
      <GroupItem
        render={<Button variant="outline" size="icon" aria-label="Menu" />}
      >
        <EllipsisIcon />
      </GroupItem>
    </Group>
  )
}
