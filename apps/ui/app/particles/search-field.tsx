"use client"

import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import { Atom01Icon, LabelIcon, Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Index } from "@/registry/__index__"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxSeparator,
  ComboboxValue,
} from "@/registry/default/ui/combobox"
import {
  getCategorySortOrder,
  isComponentCategory,
} from "@/registry/registry-categories"

interface SearchFieldProps {
  selectedItems: { label: string; value: string; isComponent?: boolean }[]
  onItemsChange: (
    items: { label: string; value: string; isComponent?: boolean }[]
  ) => void
  items: { label: string; value: string; isComponent?: boolean }[]
}

interface RegistryItem {
  type?: string
  categories?: string[]
}

// Get all particles (registry:block type) from registry
const particles = Object.values(Index).filter(
  (item: RegistryItem) => item.type === "registry:block"
)

export default function SearchField({
  selectedItems,
  onItemsChange,
  items,
}: SearchFieldProps) {
  const [open, setOpen] = useState(selectedItems.length === 0)

  // Keep popup open when no selection is made
  useEffect(() => {
    if (selectedItems.length === 0) {
      setOpen(true)
    }
  }, [selectedItems.length])

  const groupedItems = useMemo(() => {
    const selectedValues = selectedItems.map((item) => item.value)

    // Calculate which items would result in particles when combined with selected items
    const availableItems = items.filter((item) => {
      // Skip already selected items
      if (selectedValues.includes(item.value)) {
        return true
      }

      // Check if adding this category would result in any particles
      const testValues = [...selectedValues, item.value]
      const hasMatches = particles.some((particle: RegistryItem) => {
        const categories = particle.categories ?? []
        return testValues.every((value) => categories.includes(value))
      })

      return hasMatches
    })

    // Separate items into enabled and disabled
    const enabled: typeof items = []
    const disabled: typeof items = []

    items.forEach((item) => {
      const isSelected = selectedValues.includes(item.value)
      const isAvailable = availableItems.some(
        (available) => available.value === item.value
      )

      if (isSelected || isAvailable) {
        enabled.push(item)
      } else {
        disabled.push(item)
      }
    })

    // Sort enabled items: selected first, then available, then by custom order
    const sortedEnabled = [...enabled].sort((a, b) => {
      const aSelected = selectedValues.includes(a.value)
      const bSelected = selectedValues.includes(b.value)

      // Selected items first
      if (aSelected && !bSelected) return -1
      if (!aSelected && bSelected) return 1

      // Then sort by custom category order
      const aOrder = getCategorySortOrder(a.value)
      const bOrder = getCategorySortOrder(b.value)
      return aOrder - bOrder
    })

    // Sort disabled items by custom category order
    const sortedDisabled = [...disabled].sort((a, b) => {
      const aOrder = getCategorySortOrder(a.value)
      const bOrder = getCategorySortOrder(b.value)
      return aOrder - bOrder
    })

    // Return groups similar to the grouped example
    const groups: Array<{ type: "enabled" | "disabled"; items: typeof items }> =
      []

    if (sortedEnabled.length > 0) {
      groups.push({ type: "enabled", items: sortedEnabled })
    }

    if (sortedDisabled.length > 0) {
      groups.push({ type: "disabled", items: sortedDisabled })
    }

    return groups
  }, [selectedItems, items])

  const handleValueChange = (
    newItems: { label: string; value: string; isComponent?: boolean }[]
  ) => {
    onItemsChange(newItems)
    setOpen(false)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Combobox
        items={groupedItems}
        multiple
        value={selectedItems}
        onValueChange={handleValueChange}
        open={open}
        onOpenChange={setOpen}
        autoHighlight
        aria-label="Filter particles"
      >
        <ComboboxChips className="rounded-xl p-[calc(--spacing(2)-1px)] before:rounded-xl">
          <HugeiconsIcon
            icon={Search01Icon}
            strokeWidth={2}
            className="ms-[calc(--spacing(2)-1px)] me-[calc(--spacing(2)-1px)] size-5 shrink-0 opacity-72"
          />
          <ComboboxValue>
            {(
              value: { value: string; label: string; isComponent?: boolean }[]
            ) => (
              <>
                {value?.map((item) => {
                  const isComponent =
                    item.isComponent ?? isComponentCategory(item.value)
                  return (
                    <ComboboxChip key={item.value} aria-label={item.label}>
                      <div className="flex items-center gap-1.5">
                        {isComponent ? (
                          <HugeiconsIcon
                            icon={Atom01Icon}
                            strokeWidth={2}
                            className="size-3.5 opacity-72"
                          />
                        ) : (
                          <HugeiconsIcon
                            icon={LabelIcon}
                            strokeWidth={2}
                            className="size-3.5 opacity-72"
                          />
                        )}
                        <span>{item.label}</span>
                      </div>
                    </ComboboxChip>
                  )
                })}
                <ComboboxInput
                  size="lg"
                  className="ps-0"
                  aria-label="Search components"
                  showClear
                />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxPopup>
          <ComboboxEmpty>No filters found.</ComboboxEmpty>
          <ComboboxList>
            {(group: (typeof groupedItems)[number]) => (
              <React.Fragment key={group.type}>
                {group.type === "disabled" && <ComboboxSeparator />}
                <ComboboxGroup items={group.items}>
                  <ComboboxGroupLabel>
                    {group.type === "enabled"
                      ? "Filter particles"
                      : "No matches"}
                  </ComboboxGroupLabel>
                  <ComboboxCollection>
                    {(item: (typeof group.items)[number]) => {
                      const isComponent =
                        item.isComponent ?? isComponentCategory(item.value)

                      return (
                        <ComboboxItem
                          key={item.value}
                          value={item}
                          disabled={group.type === "disabled"}
                        >
                          <div className="flex items-center gap-2">
                            {isComponent ? (
                              <HugeiconsIcon
                                icon={Atom01Icon}
                                strokeWidth={2}
                                className="opacity-72"
                              />
                            ) : (
                              <HugeiconsIcon
                                icon={LabelIcon}
                                strokeWidth={2}
                                className="opacity-72"
                              />
                            )}
                            <span>{item.label}</span>
                          </div>
                        </ComboboxItem>
                      )
                    }}
                  </ComboboxCollection>
                </ComboboxGroup>
              </React.Fragment>
            )}
          </ComboboxList>
        </ComboboxPopup>
      </Combobox>
    </div>
  )
}
