"use client"

import * as React from "react"

import { Checkbox } from "@/registry/default/ui/checkbox"
import { CheckboxGroup } from "@/registry/default/ui/checkbox-group"
import { Label } from "@/registry/default/ui/label"

const frameworks = [
  { id: "next", name: "Next.js" },
  { id: "vite", name: "Vite" },
  { id: "astro", name: "Astro" },
]

export default function CheckboxGroupParentDemo() {
  const [value, setValue] = React.useState<string[]>([])

  return (
    <CheckboxGroup
      aria-labelledby="frameworks-caption"
      value={value}
      onValueChange={setValue}
      allValues={frameworks.map((framework) => framework.id)}
    >
      <Label id="frameworks-caption">
        <Checkbox name="frameworks" parent />
        Frameworks
      </Label>

      {frameworks.map((framework) => (
        <Label key={framework.id} className="ms-4">
          <Checkbox value={framework.id} />
          {framework.name}
        </Label>
      ))}
    </CheckboxGroup>
  )
}
