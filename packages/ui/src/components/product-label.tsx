"use client"

// @ts-ignore - Next types are supplied by consuming app via peerDependencies
import { usePathname } from "next/navigation"
import { Badge } from "@workspace/ui/ui/badge"

interface ProductsDropdownProps {
  items: { href: string; label: string; upcoming?: boolean; }[]
}

export function ProductLabel({ items }: ProductsDropdownProps) {
  const pathname = usePathname()
  
  // Don't display anything on home page
  if (pathname === "/") {
    return null
  }
  
  // Get the first segment of the pathname (remove leading slash)
  const firstSegment = pathname.slice(1).split('/')[0]
  
  // Check if the first segment matches any of the item labels
  const matchingItem = firstSegment ? items.find(item => item.label.toLowerCase() === firstSegment.toLowerCase()) : undefined
  
  // Only display if we have a match
  const displayCategory = matchingItem ? firstSegment : null

  if (!displayCategory) {
    return null
  }

  return (
    <>
      <span className="text-muted-foreground/64">{displayCategory}</span>
      {matchingItem?.upcoming && (
        <Badge variant="info" className="max-sm:hidden ms-2 -mt-1 font-sans">
          Upcoming
        </Badge>
      )}
    </>
  )
}
