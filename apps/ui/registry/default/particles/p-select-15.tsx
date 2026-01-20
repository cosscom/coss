import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/registry/default/ui/select";

const items = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Archived", value: "archived" },
];

export default function Particle() {
  return (
    <Select aria-label="Select filter" defaultValue="all">
      <SelectTrigger
        className="h-7 min-h-7 min-w-0 gap-1 rounded-full border-transparent bg-muted px-2.5 text-xs shadow-none before:hidden sm:min-h-7 sm:text-xs"
        size="sm"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectPopup>
        {items.map(({ label, value }) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}
