import { Label } from "@/registry/default/ui/label";
import { Switch } from "@/registry/default/ui/switch";

export default function Particle() {
  return (
    <Label>
      <Switch className="[--thumb-size:--spacing(4)] sm:[--thumb-size:--spacing(3)]" />
      Marketing emails
    </Label>
  );
}
