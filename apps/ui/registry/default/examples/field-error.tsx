import { Field, FieldError, FieldLabel } from "@/registry/default/ui/field"
import { Input } from "@/registry/default/ui/input"

export default function FieldWithErrorDemo() {
  return (
    <Field>
      <FieldLabel>Email</FieldLabel>
      <Input type="email" placeholder="Enter your email" />
      <FieldError>Please enter a valid email address.</FieldError>
    </Field>
  )
}
