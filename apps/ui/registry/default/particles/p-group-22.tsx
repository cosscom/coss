import { Group, GroupSeparator } from "@/registry/default/ui/group";
import { Label } from "@/registry/default/ui/label";
import {
  NumberField,
  NumberFieldInput,
} from "@/registry/default/ui/number-field";

export default function Particle() {
  return (
    <div className="flex flex-col gap-2">
      <Label>Range</Label>
      <Group aria-label="Range input">
        <NumberField aria-label="Min value">
          <NumberFieldInput placeholder="From" />
        </NumberField>
        <GroupSeparator />
        <NumberField aria-label="Max value">
          <NumberFieldInput placeholder="To" />
        </NumberField>
      </Group>
    </div>
  );
}
