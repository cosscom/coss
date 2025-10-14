import { Button } from "@/registry/default/ui/button"
import { Input } from "@/registry/default/ui/input"

export default function InputWithButton() {
  return (
    <div className="flex gap-2">
      <Input type="email" placeholder="you@example.com" aria-label="Email" />
      <Button variant="outline">Send</Button>
    </div>
  )
}
