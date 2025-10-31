import { InputGroup, InputGroupAddon } from "@/registry/default/ui/input-group"
import {
  NumberField,
  NumberFieldInput,
} from "@/registry/default/ui/number-field"

export default function InputGroupWithNumberField() {
  return (
    <InputGroup>
      <NumberField defaultValue={10} aria-label="Enter the amount">
        <NumberFieldInput className="text-left" />
      </NumberField>
      <InputGroupAddon>€</InputGroupAddon>
      <InputGroupAddon align="inline-end">EUR</InputGroupAddon>
    </InputGroup>
  )
}
