import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/registry/default/ui/input-group";

export default function InputGroupWithStartEndText() {
  return (
    <InputGroup>
      <InputGroupInput
        aria-label="Enter your domain"
        className="*:[input]:ps-1!"
        placeholder="coss"
        type="text"
      />
      <InputGroupAddon>
        <InputGroupText>https://</InputGroupText>
      </InputGroupAddon>
      <InputGroupAddon align="inline-end">
        <InputGroupText>.com</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  );
}
