import {
  segmentedControlItemVariants,
  segmentedControlRootClassName,
} from "@/registry/default/lib/segmented-control";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/registry/default/ui/toggle-group";

const itemClassName = segmentedControlItemVariants({
  size: "sm",
  state: "pressed",
});

export default function Particle() {
  return (
    <ToggleGroup
      aria-label="Filter issues"
      className={segmentedControlRootClassName}
      defaultValue={["open"]}
      size="sm"
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
