import { Group, GroupSeparator, GroupText } from "@/registry/default/ui/group"
import { Input } from "@/registry/default/ui/input"

export default function GroupWithEndText() {
  return (
    <Group aria-label="Domain input">
      <Input id="domain" type="text" defaultValue="coss" aria-label="Domain" />
      <GroupSeparator />
      <GroupText>.com</GroupText>
    </Group>
  )
}
