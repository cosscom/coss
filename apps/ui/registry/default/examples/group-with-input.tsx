import { CopyIcon } from "lucide-react"

import { Button } from "@/registry/default/ui/button"
import { Group, GroupSeparator } from "@/registry/default/ui/group"
import { Input } from "@/registry/default/ui/input"

export default function GroupWithInput() {
  return (
    <Group>
      <Input type="text" defaultValue="https://coss.com" />
      <GroupSeparator />
      <Button variant="outline" size="icon" aria-label="Copy">
        <CopyIcon />
      </Button>
    </Group>
  )
}
