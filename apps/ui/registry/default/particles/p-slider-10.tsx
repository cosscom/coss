import { Slider } from "@/registry/default/ui/slider";

export default function Particle() {
  return (
    <div>
      <span
        aria-hidden="true"
        className="mb-3 flex w-full items-center justify-between gap-2 font-medium text-muted-foreground text-xs"
      >
        <span>Low</span>
        <span>High</span>
      </span>
      <Slider aria-label="Slider with labels" defaultValue={50} step={10} />
    </div>
  );
}
