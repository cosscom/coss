import Link from "next/link"

import { Button } from "@/registry/default/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/registry/default/ui/pagination"

type PaginationProps = {
  currentPage: number
  totalPages: number
}

export default function Component({
  currentPage,
  totalPages,
}: PaginationProps) {
  return (
    <Pagination>
      <PaginationContent className="w-full justify-between gap-2">
        <PaginationItem>
          <Button
            variant="outline"
            disabled={currentPage === 1}
            render={
              currentPage === 1 ? undefined : (
                <Link href={`#/page/${currentPage - 1}`} />
              )
            }
          >
            Previous
          </Button>
        </PaginationItem>
        <PaginationItem>
          <Button
            variant="outline"
            disabled={currentPage === totalPages}
            render={
              currentPage === totalPages ? undefined : (
                <Link href={`#/page/${currentPage + 1}`} />
              )
            }
          >
            Next
          </Button>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
