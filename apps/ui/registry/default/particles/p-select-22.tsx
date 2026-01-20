import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/registry/default/ui/select";

const items = [
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Scheduled", value: "scheduled" },
];

export default function Particle() {
  return (
    <Select aria-label="Select status" defaultValue="draft">
      <SelectTrigger className="h-6 min-h-6 min-w-0 gap-1 rounded-full border-primary/20 bg-primary/10 px-2.5 text-primary text-xs shadow-none before:hidden sm:min-h-6 sm:text-xs">
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
