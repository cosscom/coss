import { Label } from "@/registry/default/ui/label";
import { Radio, RadioGroup } from "@/registry/default/ui/radio-group";

const palettes = [
  { label: "Mono", value: "mono", colors: ["#18181B", "#A1A1AA", "#FAFAFA"] },
  {
    label: "Porcelain",
    value: "porcelain",
    colors: ["#AA8F73", "#C8B79A", "#889FA3"],
  },
  { label: "Ember", value: "ember", colors: ["#B94724", "#DB8649", "#EDD0A0"] },
  { label: "Terra", value: "terra", colors: ["#A64F3C", "#C78F70", "#896577"] },
  { label: "Rosé", value: "rose", colors: ["#9B3F60", "#C98693", "#E9B9A5"] },
  { label: "Dusk", value: "dusk", colors: ["#BE835B", "#8E7C9F", "#6E97AE"] },
  {
    label: "Orchard",
    value: "orchard",
    colors: ["#63794B", "#ADA66B", "#83A18A"],
  },
  {
    label: "Petrol",
    value: "petrol",
    colors: ["#326A76", "#C97868", "#C9AD81"],
  },
  {
    label: "Lagoon",
    value: "lagoon",
    colors: ["#247E92", "#4CAFA3", "#B6D8C7"],
  },
  {
    label: "Borealis",
    value: "borealis",
    colors: ["#267F69", "#527FB8", "#9A83BF"],
  },
  {
    label: "Cobalt",
    value: "cobalt",
    colors: ["#244E9A", "#607DA9", "#B5C9DD"],
  },
  { label: "Iris", value: "iris", colors: ["#7361A3", "#AC87A5", "#DBC3CA"] },
];

export default function Particle() {
  return (
    <fieldset className="w-full space-y-3">
      <legend className="font-medium text-sm">Color palette</legend>
      <RadioGroup
        aria-label="Color palette"
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        defaultValue="dusk"
      >
        {palettes.map((palette) => (
          <Label
            key={palette.value}
            className="flex flex-col items-stretch gap-3 rounded-lg border p-3 hover:bg-accent/50 has-data-checked:border-primary/48 has-data-checked:bg-accent/50"
          >
            <span
              aria-hidden="true"
              className="flex h-8 overflow-hidden rounded-md ring-1 ring-foreground/10"
            >
              {palette.colors.map((color) => (
                <span
                  key={color}
                  className="flex-1"
                  style={{ backgroundColor: color }}
                />
              ))}
            </span>
            <span className="flex items-center justify-between gap-2">
              {palette.label}
              <Radio value={palette.value} />
            </span>
          </Label>
        ))}
      </RadioGroup>
    </fieldset>
  );
}
