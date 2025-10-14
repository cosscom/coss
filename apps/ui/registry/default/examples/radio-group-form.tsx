"use client"

import * as React from "react"

import { Button } from "@/registry/default/ui/button"
import { Field, FieldLabel } from "@/registry/default/ui/field"
import { Fieldset, FieldsetLegend } from "@/registry/default/ui/fieldset"
import { Form } from "@/registry/default/ui/form"
import { Radio, RadioGroup } from "@/registry/default/ui/radio-group"

export default function RadioGroupFormDemo() {
  const [loading, setLoading] = React.useState(false)

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    setLoading(false)
    alert(`Selected: ${formData.get("frameworks")}`)
  }

  return (
    <Form onSubmit={onSubmit} className="max-w-[160px]">
      <Field
        name="frameworks"
        className="gap-4"
        render={(props) => <Fieldset {...props} />}
      >
        <FieldsetLegend className="text-sm font-medium">
          Frameworks
        </FieldsetLegend>
        <RadioGroup defaultValue="next">
          <FieldLabel>
            <Radio value="next" disabled={loading} /> Next.js
          </FieldLabel>
          <FieldLabel>
            <Radio value="vite" disabled={loading} /> Vite
          </FieldLabel>
          <FieldLabel>
            <Radio value="astro" disabled={loading} /> Astro
          </FieldLabel>
        </RadioGroup>
      </Field>
      <Button type="submit" disabled={loading}>
        Submit
      </Button>
    </Form>
  )
}
