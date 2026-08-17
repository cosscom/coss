"use client";

import {
  segmentedControlItemVariants,
  segmentedControlRootClassName,
} from "@/registry/default/lib/segmented-control";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/registry/default/ui/toggle-group";

const itemClassName = segmentedControlItemVariants({ state: "pressed" });

export default function Particle() {
  return (
    <ToggleGroup
      aria-label="Filter issues"
      className={segmentedControlRootClassName}
      defaultValue={["open"]}
      onValueChange={(value, eventDetails) => {
        if (value.length === 0) {
          eventDetails.cancel();
        }
      }}
    >
      <ToggleGroupItem className={itemClassName} value="open">
        Open
      </ToggleGroupItem>
      <ToggleGroupItem className={itemClassName} value="assigned">
        Assigned
      </ToggleGroupItem>
      <ToggleGroupItem className={itemClassName} value="urgent">
        Urgent
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
