import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/registry/default/ui/field"
import { Input } from "@/registry/default/ui/input"

export default function FieldDemo() {
  return (
    <Field>
      <FieldLabel>Name</FieldLabel>
      <Input type="text" placeholder="Enter your name" />
      <FieldDescription>Visible on your profile</FieldDescription>
    </Field>
  )
}
