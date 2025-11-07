"use client"

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxValue,
} from "@/registry/default/ui/combobox"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/registry/default/ui/field"

interface SearchFieldProps {
  selectedItems: { label: string; value: string }[]
  onItemsChange: (items: { label: string; value: string }[]) => void
  items: { label: string; value: string }[]
}

export default function SearchField({
  selectedItems,
  onItemsChange,
  items,
}: SearchFieldProps) {
  return (
    <div className="mx-auto max-w-2xl">
      <Field>
        <FieldLabel>Search by category or feature</FieldLabel>
        <Combobox
          items={items}
          multiple
          value={selectedItems}
          onValueChange={onItemsChange}
        >
          <ComboboxChips>
            <ComboboxValue>
              {(value: { value: string; label: string }[]) => (
                <>
                  {value?.map((item) => (
                    <ComboboxChip key={item.value} aria-label={item.label}>
                      {item.label}
                    </ComboboxChip>
                  ))}
                  <ComboboxInput
                    placeholder={
                      value.length > 0 ? undefined : "Select categories..."
                    }
                    aria-label="Select categories"
                  />
                </>
              )}
            </ComboboxValue>
          </ComboboxChips>
          <ComboboxPopup>
            <ComboboxEmpty>No categories found.</ComboboxEmpty>
            <ComboboxList>
              {(item) => (
                <ComboboxItem key={item.value} value={item}>
                  {item.label}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxPopup>
        </Combobox>
        <FieldDescription>
          Select multiple categories to filter components.
        </FieldDescription>
      </Field>
    </div>
  )
}
