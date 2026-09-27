"use client";

import {
  Select,
  SelectItem,
  SelectLabel,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/registry/default/ui/select";

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
    <Select
      defaultValue={palettes[5]}
      items={palettes}
      itemToStringValue={(palette) => palette.value}
    >
      <SelectLabel>Color palette</SelectLabel>
      <SelectTrigger>
        <SelectValue>
          {(palette: (typeof palettes)[number]) => (
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="flex shrink-0 -space-x-1">
                {palette.colors.map((color) => (
                  <span
                    key={color}
                    className="size-4 rounded-full ring-1 ring-background"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </span>
              <span className="truncate">{palette.label}</span>
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectPopup alignItemWithTrigger={false}>
        {palettes.map((palette) => (
          <SelectItem key={palette.value} value={palette}>
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="flex shrink-0 -space-x-1">
                {palette.colors.map((color) => (
                  <span
                    key={color}
                    className="size-4 rounded-full ring-1 ring-background"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </span>
              {palette.label}
            </span>
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}
