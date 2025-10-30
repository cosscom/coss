import { useId } from "react"

import { Input } from "@/registry/default/ui/input"
import { Label } from "@/registry/default/ui/label"

export default function InputWithLabel() {
  const id = useId()
  return (
    <div className="flex flex-col items-start gap-2">
      <Label htmlFor={id}>Email</Label>
      <Input
        id={id}
        type="email"
        placeholder="you@example.com"
        aria-label="Email"
      />
    </div>
  )
}
