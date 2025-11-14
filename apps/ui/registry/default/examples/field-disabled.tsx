import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/registry/default/ui/field";
import { Input } from "@/registry/default/ui/input";

export default function FieldDisabledDemo() {
  return (
    <Field disabled>
      <FieldLabel>Email</FieldLabel>
      <Input type="email" placeholder="Enter your email" disabled />
      <FieldDescription>This field is currently disabled.</FieldDescription>
    </Field>
  );
}
