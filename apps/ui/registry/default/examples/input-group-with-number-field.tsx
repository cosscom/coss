import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
} from "@/registry/default/ui/input-group";
import {
  NumberField,
  NumberFieldInput,
} from "@/registry/default/ui/number-field";

export default function InputGroupWithNumberField() {
  return (
    <InputGroup>
      <NumberField defaultValue={10} aria-label="Enter the amount">
        <NumberFieldInput className="text-left" />
      </NumberField>
      <InputGroupAddon>
        <InputGroupText>€</InputGroupText>
      </InputGroupAddon>
      <InputGroupAddon align="inline-end">
        <InputGroupText>EUR</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  );
}
