import { ZoomInIcon, ZoomOutIcon } from "lucide-react"

import { Button } from "@/registry/default/ui/button"
import { Group, GroupSeparator } from "@/registry/default/ui/group"

export default function GroupVertical() {
  return (
    <Group orientation="vertical" aria-label="Zoom controls">
      <Button variant="outline" size="icon" aria-label="Zoom in">
        <ZoomInIcon />
      </Button>
      <GroupSeparator orientation="horizontal" />
      <Button variant="outline" size="icon" aria-label="Zoom Out">
        <ZoomOutIcon />
      </Button>
    </Group>
  )
}
