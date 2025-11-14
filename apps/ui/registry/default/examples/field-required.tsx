import { Field, FieldError, FieldLabel } from "@/registry/default/ui/field";
import { Input } from "@/registry/default/ui/input";

export default function FieldRequiredDemo() {
  return (
    <Field>
      <FieldLabel>
        Password <span className="text-destructive-foreground">*</span>
      </FieldLabel>
      <Input type="password" placeholder="Enter password" required />
      <FieldError>Please fill out this field.</FieldError>
    </Field>
  );
}
