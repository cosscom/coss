import { Slider, SliderValue } from "@/registry/default/ui/slider";

export default function Particle() {
  return (
    <div className="flex h-48 justify-center gap-8">
      <Slider
        aria-label="60 Hz"
        defaultValue={2}
        max={5}
        min={-5}
        orientation="vertical"
      >
        <SliderValue className="sr-only" />
      </Slider>
      <Slider
        aria-label="250 Hz"
        defaultValue={1}
        max={5}
        min={-5}
        orientation="vertical"
      >
        <SliderValue className="sr-only" />
      </Slider>
      <Slider
        aria-label="1k"
        defaultValue={-1}
        max={5}
        min={-5}
        orientation="vertical"
      >
        <SliderValue className="sr-only" />
      </Slider>
      <Slider
        aria-label="4k"
        defaultValue={-3}
        max={5}
        min={-5}
        orientation="vertical"
      >
        <SliderValue className="sr-only" />
      </Slider>
      <Slider
        aria-label="16k"
        defaultValue={2}
        max={5}
        min={-5}
        orientation="vertical"
      >
        <SliderValue className="sr-only" />
      </Slider>
    </div>
  );
}
