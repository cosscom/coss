import { Button } from "@/registry/default/ui/button"

export default function Component() {
  return (
    <Button variant="outline" className="gap-3">
      Messages
      <span className="-me-1 inline-flex h-5 max-h-full items-center rounded border px-1 font-[inherit] text-[0.625rem] font-medium text-muted-foreground">
        18
      </span>
    </Button>
  )
}
