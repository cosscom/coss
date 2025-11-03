import { Button } from "@/registry/default/ui/button"
import { Spinner } from "@/registry/default/ui/spinner"

export default function ButtonLoading() {
  return (
    <Button disabled>
      <Spinner />
      Loading...
    </Button>
  )
}
