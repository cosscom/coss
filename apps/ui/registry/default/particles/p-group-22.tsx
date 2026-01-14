import { Group, GroupSeparator } from "@/registry/default/ui/group";
import { Input } from "@/registry/default/ui/input";
import { Label } from "@/registry/default/ui/label";

export default function Particle() {
  return (
    <div className="flex flex-col gap-2">
      <Label>Range</Label>
      <Group aria-label="Range input">
        <Input
          aria-label="Min value"
          className="[-moz-appearance:_textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          placeholder="From"
          type="number"
        />
        <GroupSeparator />
        <Input
          aria-label="Max value"
          className="[-moz-appearance:_textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          placeholder="To"
          type="number"
        />
      </Group>
    </div>
  );
}
