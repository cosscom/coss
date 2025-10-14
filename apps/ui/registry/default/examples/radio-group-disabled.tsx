import { Label } from "@/registry/default/ui/label"
import { Radio, RadioGroup } from "@/registry/default/ui/radio-group"

export default function RadioGroupDisabledDemo() {
  return (
    <RadioGroup defaultValue="next">
      <Label>
        <Radio value="next" /> Next.js
      </Label>
      <Label>
        <Radio value="vite" disabled /> Vite (disabled)
      </Label>
      <Label>
        <Radio value="astro" /> Astro
      </Label>
    </RadioGroup>
  )
}
