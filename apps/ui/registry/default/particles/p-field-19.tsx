import { Field, FieldError, FieldLabel } from "@/registry/default/ui/field";
import { Input } from "@/registry/default/ui/input";

export default function Particle() {
  return (
    <Field>
      <FieldLabel>Email</FieldLabel>
      <Input defaultValue="invalid-email" placeholder="Email" type="email" />
      <FieldError match="typeMismatch">
        Please enter a valid email address.
      </FieldError>
    </Field>
  );
}
