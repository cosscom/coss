import { Button } from "@/registry/default/ui/button"
import { Kbd } from "@/registry/default/ui/kbd"

export default function ButtonWithKbd() {
  return (
    <Button variant="outline" className="pe-[calc(--spacing(1.5)-1px)]">
      Search
      <Kbd>⌘K</Kbd>
    </Button>
  )
}
