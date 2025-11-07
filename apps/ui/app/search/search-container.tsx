"use client"

import { useCallback, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"
import { particles } from "@/registry/default/particles"

import SearchField from "./search-field"

// Extract unique categories from particles
const uniqueCategories = Array.from(
  new Set(particles.flatMap((particle) => particle.category || []))
).sort()

// Convert to search items format with proper capitalization
const searchItems = uniqueCategories.map((category) => ({
  label: category
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" "),
  value: category,
}))

export default function SearchContainer() {
  const searchParams = useSearchParams()
  const [selectedItems, setSelectedItems] = useState<
    { label: string; value: string }[]
  >(() => {
    const tags = searchParams?.get("tags")?.split(",").filter(Boolean) || []
    return tags
      .map((tag) => searchItems.find((item) => item.value === tag))
      .filter((item): item is { label: string; value: string } => !!item)
  })

  const filteredParticles = useMemo(() => {
    if (selectedItems.length === 0) return []

    const selectedValues = selectedItems.map((item) => item.value)
    return particles.filter((particle) =>
      selectedValues.some(
        (value) => particle.category?.includes(value) || false
      )
    )
  }, [selectedItems])

  const updateSelectedItems = useCallback(
    (items: { label: string; value: string }[]) => {
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
    <div className="space-y-8">
      <SearchField
        selectedItems={selectedItems}
        onItemsChange={updateSelectedItems}
        items={searchItems}
      />

      {selectedItems.length > 0 && (
        <div>
          <h2 className="mb-6 text-xl font-semibold">
            Search Results ({filteredParticles.length})
          </h2>
          {filteredParticles.length === 0 ? (
            <div className="rounded-lg border border-border bg-muted/50 p-8 text-center">
              <p className="text-muted-foreground">
                No components found for the selected categories.
              </p>
            </div>
          ) : (
            <div className="grid flex-1 items-stretch gap-9 pb-12 lg:grid-cols-2 lg:gap-6 xl:gap-9">
              {filteredParticles.map((particle) => {
                const ParticleComponent = particle.component
                return (
                  <div
                    key={particle.id}
                    className={cn(
                      "group relative flex min-w-0 flex-col rounded-xl border bg-muted/50 transition-colors",
                      particle.fullWidth ? "lg:col-span-2" : "lg:col-span-1",
                      particle.className
                    )}
                  >
                    <div className="flex min-w-0 flex-1 flex-col flex-wrap items-center justify-center overflow-x-auto rounded-xl border bg-background p-6 lg:px-8 lg:py-12">
                      <div data-slot="particle-wrapper">
                        <ParticleComponent
                          currentPage={1}
                          totalPages={10}
                          totalResults={100}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-b-xl p-3 text-xs text-muted-foreground">
                      <span className="flex-1 truncate font-mono">
                        {particle.id}
                      </span>
                      {particle.category && particle.category.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {particle.category.map((cat) => (
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

      {selectedItems.length === 0 && (
        <div className="mx-auto max-w-4xl rounded-lg border border-border bg-muted/50 p-8 text-center">
          <p className="text-muted-foreground">
            Select one or more categories to start searching for components.
          </p>
        </div>
      )}
    </div>
  )
}
