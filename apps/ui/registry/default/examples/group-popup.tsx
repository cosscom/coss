import { ChevronDownIcon, GitForkIcon } from "lucide-react";

import { Badge } from "@/registry/default/ui/badge";
import { Button } from "@/registry/default/ui/button";
import { Group, GroupSeparator } from "@/registry/default/ui/group";
import {
  Popover,
  PopoverDescription,
  PopoverPopup,
  PopoverTitle,
  PopoverTrigger,
} from "@/registry/default/ui/popover";

export default function GroupPopup() {
  return (
    <Group aria-label="Repository actions">
      <Button variant="outline">
        <GitForkIcon />
        Fork
        <Badge variant="secondary">48</Badge>
      </Button>
      <GroupSeparator />
      <Popover>
        <PopoverTrigger
          render={
            <Button variant="outline" size="icon" aria-label="Send options" />
          }
        >
          <ChevronDownIcon />
        </PopoverTrigger>
        <PopoverPopup className="w-64" align="end">
          <PopoverTitle className="text-base">Existing forks</PopoverTitle>
          <PopoverDescription>
            You don't have any forks of this repository.
          </PopoverDescription>
        </PopoverPopup>
      </Popover>
    </Group>
  );
}
