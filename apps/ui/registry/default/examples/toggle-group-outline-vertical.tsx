import { BoldIcon, ItalicIcon, UnderlineIcon } from "lucide-react";

import {
  Toggle,
  ToggleGroup,
  ToggleGroupSeparator,
} from "@/registry/default/ui/toggle-group";

export default function ToggleGroupOutline() {
  return (
    <ToggleGroup
      orientation="vertical"
      variant="outline"
      defaultValue={["bold"]}
    >
      <Toggle value="bold" aria-label="Toggle bold">
        <BoldIcon />
      </Toggle>
      <ToggleGroupSeparator orientation="horizontal" />
      <Toggle value="italic" aria-label="Toggle italic">
        <ItalicIcon />
      </Toggle>
      <ToggleGroupSeparator orientation="horizontal" />
      <Toggle value="underline" aria-label="Toggle underline">
        <UnderlineIcon />
      </Toggle>
    </ToggleGroup>
  );
}
