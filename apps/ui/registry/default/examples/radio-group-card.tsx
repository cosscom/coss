import { Label } from "@/registry/default/ui/label"
import { Radio, RadioGroup } from "@/registry/default/ui/radio-group"

export default function RadioGroupCardDemo() {
  return (
    <RadioGroup defaultValue="r-1">
      <Label className="flex items-start gap-2 rounded-lg border p-3 hover:bg-accent/50 has-data-checked:border-primary/48 has-data-checked:bg-accent/50">
        <Radio value="r-1" />
        <div className="flex flex-col gap-1">
          <p className="text-sm leading-4">Email</p>
          <p className="text-xs text-muted-foreground">
            Receive notifications via email.
          </p>
        </div>
      </Label>
      <Label className="flex items-start gap-2 rounded-lg border p-3 hover:bg-accent/50 has-data-checked:border-primary/48 has-data-checked:bg-accent/50">
        <Radio value="r-2" />
        <div className="flex flex-col gap-1">
          <p className="text-sm leading-4">SMS</p>
          <p className="text-xs text-muted-foreground">
            Receive notifications via text message.
          </p>
        </div>
      </Label>
    </RadioGroup>
  )
}
