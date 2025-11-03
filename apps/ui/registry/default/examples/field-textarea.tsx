"use client"

import {
  Field,
  FieldControl,
  FieldDescription,
  FieldLabel,
} from "@/registry/default/ui/field"
import { Textarea } from "@/registry/default/ui/textarea"

export default function FieldTextareaDemo() {
  return (
    <Field>
      <FieldLabel>Bio</FieldLabel>
      <Textarea placeholder="Tell us about yourself…" />
      <FieldDescription>
        Write a short bio. Maximum 500 characters.
      </FieldDescription>
    </Field>
  )
}
