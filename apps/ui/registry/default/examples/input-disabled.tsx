import { Input } from "@/registry/default/ui/input";

export default function InputDisabled() {
  return (
    <Input type="text" placeholder="Disabled" disabled aria-label="Disabled" />
  );
}
