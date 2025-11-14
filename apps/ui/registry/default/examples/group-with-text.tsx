import { Group, GroupSeparator, GroupText } from "@/registry/default/ui/group";
import { Input } from "@/registry/default/ui/input";
import { Label } from "@/registry/default/ui/label";

export default function GroupWithText() {
  return (
    <Group aria-label="Domain input">
      <GroupText render={<Label htmlFor="domain" aria-label="Domain" />}>
        https://
      </GroupText>
      <GroupSeparator />
      <Input
        id="domain"
        type="text"
        defaultValue="coss.com"
        aria-label="Domain"
      />
    </Group>
  );
}
