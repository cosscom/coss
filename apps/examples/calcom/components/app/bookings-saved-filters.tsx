"use client";

import { Button } from "@coss/ui/components/button";
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxTrigger,
} from "@coss/ui/components/combobox";
import { Group, GroupSeparator } from "@coss/ui/components/group";
import { ChevronsUpDownIcon, XIcon } from "lucide-react";
import { useState } from "react";

const savedFilters = [
  { label: "This Week", value: "this-week" },
  { label: "This Month", value: "this-month" },
  { label: "Last 30 Days", value: "last-30-days" },
  { label: "Last 90 Days", value: "last-90-days" },
];

type SavedFilter = (typeof savedFilters)[number];

function BookingsSavedFilters() {
  const [value, setValue] = useState<SavedFilter | null>(null);

  return (
    <Combobox
      items={savedFilters}
      onValueChange={(v) => setValue(v)}
      value={value}
    >
      {value ? (
        <Group aria-label="Saved filter">
          <ComboboxTrigger render={<Button variant="outline" />}>
            {value.label}
            <ChevronsUpDownIcon />
          </ComboboxTrigger>
          <GroupSeparator />
          <Button
            aria-label="Clear filter"
            onClick={() => setValue(null)}
            size="icon"
            variant="outline"
          >
            <XIcon />
          </Button>
        </Group>
      ) : (
        <ComboboxTrigger render={<Button variant="outline" />}>
          Saved Filters
          <ChevronsUpDownIcon />
        </ComboboxTrigger>
      )}
      <ComboboxPopup align="end" aria-label="Select saved filter">
        <div className="border-b p-2">
          <ComboboxInput
            className="rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
            placeholder="e.g. This Week"
            showTrigger={false}
          />
        </div>
        <ComboboxEmpty>No filters found.</ComboboxEmpty>
        <ComboboxList>
          {(filter: SavedFilter) => (
            <ComboboxItem key={filter.value} value={filter}>
              {filter.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxPopup>
    </Combobox>
  );
}

export { BookingsSavedFilters };
