import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";

import { Button } from "@/registry/default/ui/button";
import { Group, GroupSeparator } from "@/registry/default/ui/group";

export default function GroupNested() {
  return (
    <Group aria-label="Pagination">
      <Group aria-label="Page numbers">
        <Button variant="outline" className="min-w-8">
          1
        </Button>
        <GroupSeparator />
        <Button variant="outline" className="min-w-8">
          2
        </Button>
        <GroupSeparator />
        <Button variant="outline" className="min-w-8">
          3
        </Button>
        <GroupSeparator />
        <Button variant="outline" className="min-w-8">
          4
        </Button>
        <GroupSeparator />
        <Button variant="outline" className="min-w-8">
          5
        </Button>
      </Group>
      <Group aria-label="Navigation">
        <Button variant="outline" size="icon" aria-label="Previous">
          <ArrowLeftIcon />
        </Button>
        <GroupSeparator />
        <Button variant="outline" size="icon" aria-label="Next">
          <ArrowRightIcon />
        </Button>
      </Group>
    </Group>
  );
}
