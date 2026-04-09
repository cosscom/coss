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
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@coss/ui/components/menu";
import { SelectButton } from "@coss/ui/components/select";
import {
  ChevronsUpDownIcon,
  CopyIcon,
  EllipsisIcon,
  PencilIcon,
  SearchIcon,
  TrashIcon,
} from "lucide-react";
import type * as React from "react";
import { useState } from "react";

export type SavedFilter = {
  id: string;
  isDefault?: boolean;
  label: string;
};

export function SavedFiltersCombobox({
  filters,
}: {
  filters: SavedFilter[];
}): React.ReactElement {
  const [selectedFilter, setSelectedFilter] = useState<SavedFilter | null>(
    null,
  );

  if (!selectedFilter) {
    return (
      <Combobox
        items={filters}
        onValueChange={setSelectedFilter}
        value={selectedFilter}
      >
        <ComboboxTrigger render={<SelectButton size="sm" className="w-fit" />}>
          Saved Filters
        </ComboboxTrigger>
        <ComboboxPopup align="end" aria-label="Select saved filter">
          <div className="border-b p-2">
            <ComboboxInput
              className="rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
              placeholder="Search saved filters"
              showTrigger={false}
              size="sm"
              startAddon={<SearchIcon />}
            />
          </div>
          <ComboboxEmpty>No saved filters.</ComboboxEmpty>
          <ComboboxList>
            {(filter: SavedFilter): React.ReactElement => (
              <ComboboxItem key={filter.id} value={filter}>
                {filter.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxPopup>
      </Combobox>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Group>
        <Combobox
          items={filters}
          onValueChange={setSelectedFilter}
          value={selectedFilter}
        >
          <ComboboxTrigger render={<Button size="sm" variant="outline" />}>
            {selectedFilter.label}
            <ChevronsUpDownIcon />
          </ComboboxTrigger>
          <ComboboxPopup align="end" aria-label="Select saved filter">
            <div className="border-b p-2">
              <ComboboxInput
                placeholder="Search saved filters"
                showTrigger={false}
                startAddon={<SearchIcon />}
              />
            </div>
            <ComboboxEmpty>No saved filters.</ComboboxEmpty>
            <ComboboxList>
              {(filter: SavedFilter): React.ReactElement => (
                <ComboboxItem key={filter.id} value={filter}>
                  {filter.label}
                </ComboboxItem>
              )}
            </ComboboxList>
            <div className="border-t p-2">
              <Button
                className="w-full rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
                onClick={(): void => setSelectedFilter(null)}
                size="sm"
                variant="outline"
              >
                Clear selection
              </Button>
            </div>
          </ComboboxPopup>
        </Combobox>
        <GroupSeparator />
        <Menu>
          <MenuTrigger
            render={
              <Button
                aria-label="Edit saved filter"
                size="icon-sm"
                variant="outline"
              />
            }
          >
            <EllipsisIcon />
          </MenuTrigger>
          <MenuPopup align="end">
            {!selectedFilter.isDefault && (
              <MenuItem>
                <PencilIcon />
                Rename
              </MenuItem>
            )}
            <MenuItem>
              <CopyIcon />
              Duplicate
            </MenuItem>
            {!selectedFilter.isDefault && <MenuSeparator />}
            {!selectedFilter.isDefault && (
              <MenuItem variant="destructive">
                <TrashIcon />
                Delete
              </MenuItem>
            )}
          </MenuPopup>
        </Menu>
      </Group>
    </div>
  );
}
