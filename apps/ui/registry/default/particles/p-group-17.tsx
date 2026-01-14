import { Group, GroupSeparator, GroupText } from "@/registry/default/ui/group";
import { Input } from "@/registry/default/ui/input";

export default function Particle() {
  return (
    <Group aria-label="Price input">
      <Input
        aria-label="Enter the amount"
        className="text-right"
        defaultValue="100"
        type="text"
      />
      <GroupSeparator />
      <GroupText>USD</GroupText>
    </Group>
  );
}
