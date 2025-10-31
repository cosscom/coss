import { Button } from "@/registry/default/ui/button"
import { Kbd } from "@/registry/default/ui/kbd"

export default function ButtonWithKbd() {
  return (
    <Button variant="outline">
      Search<Kbd className="-me-1">⌘K</Kbd>
    </Button>
  )
}
