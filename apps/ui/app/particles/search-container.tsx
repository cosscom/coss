"use client"

import { Suspense, useCallback, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"
import { Index } from "@/registry/__index__"
import {
  getCategorySortOrder,
  isComponentCategory,
  type RegistryCategory,
} from "@/registry/registry-categories"

import SearchField from "./search-field"

type RegistryItem = {
  name: string
  type: string
  categories?: RegistryCategory[]
  meta?: {
    className?: string
  }
  component?: React.LazyExoticComponent<any>
}

// Get all particles (registry:block type) from registry
const particles = Object.values(Index).filter(
  (item: any) => item.type === "registry:block"
) as RegistryItem[]

// Extract unique categories from particles and sort by custom order
const uniqueCategories = Array.from(
  new Set(particles.flatMap((particle) => particle.categories || []))
).sort((a, b) => {
  const orderA = getCategorySortOrder(a)
  const orderB = getCategorySortOrder(b)
  return orderA - orderB
})

// Convert to search items format with proper capitalization
const searchItems = uniqueCategories.map((category: string) => ({
  label: category
    .split(" ")
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" "),
  value: category,
  isComponent: isComponentCategory(category),
}))

function ParticleRenderer({ name }: { name: string }) {
  const item = Index[name]
  const Component = item?.component

  if (!Component) {
    return (
      <p className="text-sm text-muted-foreground">
        Component {name} not found
      </p>
    )
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-20 items-center justify-center">
          Loading...
        </div>
      }
    >
      <Component currentPage={1} totalPages={10} totalResults={100} />
    </Suspense>
  )
}

export default function SearchContainer() {
  const searchParams = useSearchParams()
  const [selectedItems, setSelectedItems] = useState<
    { label: string; value: string; isComponent?: boolean }[]
  >(() => {
    const tags = searchParams?.get("tags")?.split(",").filter(Boolean) || []
    return tags
      .map((tag) => searchItems.find((item) => item.value === tag))
      .filter(
        (
          item
        ): item is { label: string; value: string; isComponent: boolean } =>
          !!item
      )
  })

  const filteredParticles = useMemo(() => {
    if (selectedItems.length === 0) return []

    const selectedValues = selectedItems.map(
      (item) => item.value
    ) as RegistryCategory[]
    return particles.filter((particle) => {
      const categories = particle.categories ?? []
      return selectedValues.every((value) => categories.includes(value))
    })
  }, [selectedItems])

  const updateSelectedItems = useCallback(
    (items: { label: string; value: string; isComponent?: boolean }[]) => {
      setSelectedItems(items)

      // Update URL with selected tags
      const url = new URL(window.location.href)
      if (items.length > 0) {
        const tags = items.map((item) => item.value).join(",")
        url.searchParams.set("tags", tags)
      } else {
        url.searchParams.delete("tags")
      }
      window.history.replaceState({}, "", url.toString())
    },
    []
  )

  return (
    <div className="space-y-8 md:space-y-12 lg:space-y-16">
      <SearchField
        selectedItems={selectedItems}
        onItemsChange={updateSelectedItems}
        items={searchItems}
      />

      {selectedItems.length > 0 && (
        <div>
          {filteredParticles.length === 0 ? (
            <div className="rounded-lg border border-border bg-muted/50 p-8 text-center">
              <p className="text-muted-foreground">
                No components found for the selected filters.
              </p>
            </div>
          ) : (
            <div className="grid flex-1 items-stretch gap-9 pb-12 lg:grid-cols-2 lg:gap-6 xl:gap-9">
              {filteredParticles.map((particle) => {
                const className = particle.meta?.className as string | undefined
                const categories = particle.categories ?? []
                return (
                  <div
                    key={particle.name}
                    className={cn(
                      "group relative flex min-w-0 flex-col rounded-xl border bg-muted/50 transition-colors",
                      className
                    )}
                  >
                    <div
                      className={cn(
                        "flex min-w-0 flex-1 flex-col flex-wrap items-center justify-center overflow-x-auto rounded-xl border bg-background p-6 lg:px-8 lg:py-12",
                        className
                      )}
                      data-slot="particle-wrapper"
                    >
                      <ParticleRenderer name={particle.name} />
                    </div>
                    <div className="flex items-center gap-2 rounded-b-xl p-3 text-xs text-muted-foreground">
                      <span className="flex-1 truncate font-mono">
                        {particle.name}
                      </span>
                      {categories.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {categories.map((cat: RegistryCategory) => (
                            <span
                              key={cat}
                              className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
