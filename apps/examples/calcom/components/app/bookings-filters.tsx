"use client";

import { Badge } from "@coss/ui/components/badge";
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
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@coss/ui/components/input-group";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@coss/ui/components/menu";
import { SelectButton } from "@coss/ui/components/select";
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import {
  ChevronsUpDownIcon,
  CopyIcon,
  EllipsisIcon,
  ListFilterIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "lucide-react";
import type * as React from "react";
import { useState } from "react";
import { DateRangeFilterChip } from "./filter-chip-date-range";
import { OptionsFilterChip } from "./filter-chip-options";
import { TextFilterChip } from "./filter-chip-text";
import {
  type ActiveFilter,
  type FilterField,
  isActiveFilterComplete,
  type TextFilterOperator,
} from "./filter-chip-types";
import type { Booking } from "@/lib/mock-bookings-data";
import {
  mockPastBookings,
  mockUpcomingBookings,
} from "@/lib/mock-bookings-data";

function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getUniqueEventTypes(
  bookings: Booking[],
): { id: string; label: string }[] {
  const eventTypeMap = new Map<string, { id: string; label: string }>();
  for (const booking of bookings) {
    if (booking.eventType) {
      const id = toKebabCase(booking.eventType.slug);
      if (!eventTypeMap.has(id)) {
        eventTypeMap.set(id, {
          id,
          label: booking.eventType.title,
        });
      }
    }
  }
  return Array.from(eventTypeMap.values()).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
}

function getUniqueMembers(
  bookings: Booking[],
): { avatar: string | null; id: string; label: string }[] {
  const memberMap = new Map<
    string,
    { avatar: string | null; id: string; label: string }
  >();
  for (const booking of bookings) {
    if (booking.user?.name) {
      const id = toKebabCase(booking.user.name);
      if (!memberMap.has(id)) {
        memberMap.set(id, {
          avatar: booking.user.avatarUrl,
          id,
          label: booking.user.name,
        });
      }
    }
  }
  return Array.from(memberMap.values()).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
}

const allBookings: Booking[] = [...mockPastBookings, ...mockUpcomingBookings];

const filterCategories: FilterField[] = [
  {
    id: "eventTypeId",
    kind: "options",
    label: "Event Type",
    options: getUniqueEventTypes(allBookings),
  },
  {
    id: "userIds",
    kind: "options",
    label: "Member",
    options: getUniqueMembers(allBookings),
    showAvatar: true,
  },
  {
    id: "attendeesName",
    kind: "text",
    label: "Attendees Name",
  },
  {
    id: "attendeeEmail",
    kind: "text",
    label: "Attendee Email",
  },
  {
    id: "dateRange",
    kind: "dateRange",
    label: "Date Range",
  },
  {
    id: "bookingUid",
    kind: "text",
    label: "Booking UID",
  },
];

function useActiveFilters(): {
  activeFilters: ActiveFilter[];
  addFilter: (
    columnId: string,
    initial?: Partial<Pick<ActiveFilter, "op" | "v">>,
  ) => void;
  clearAll: () => void;
  removeFilter: (columnId: string) => void;
  updateFilter: (
    columnId: string,
    values: string[],
    op?: TextFilterOperator,
  ) => void;
} {
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  const addFilter = (
    columnId: string,
    initial?: Partial<Pick<ActiveFilter, "op" | "v">>,
  ): void => {
    if (!activeFilters.some((filter) => filter.f === columnId)) {
      setActiveFilters([...activeFilters, { f: columnId, ...initial }]);
    }
  };

  const updateFilter = (
    columnId: string,
    values: string[],
    op?: TextFilterOperator,
  ): void => {
    setActiveFilters((prev) => {
      const exists = prev.some((filter) => filter.f === columnId);
      if (exists) {
        return prev.map((filter) =>
          filter.f === columnId
            ? {
                ...filter,
                v: values,
                ...(op !== undefined ? { op } : {}),
              }
            : filter,
        );
      }
      return [...prev, { f: columnId, v: values, ...(op ? { op } : {}) }];
    });
  };

  const removeFilter = (columnId: string): void => {
    setActiveFilters((prev) => prev.filter((filter) => filter.f !== columnId));
  };

  const clearAll = (): void => {
    setActiveFilters([]);
  };

  return {
    activeFilters,
    addFilter,
    clearAll,
    removeFilter,
    updateFilter,
  };
}

function FilterMenu({
  activeFilterIds,
  fields,
  hasFilters = false,
  onSelectFilter,
}: {
  activeFilterIds: string[];
  fields: FilterField[];
  hasFilters?: boolean;
  onSelectFilter: (fieldId: string) => void;
}): React.ReactElement | null {
  const available = fields.filter((f) => !activeFilterIds.includes(f.id));

  if (available.length === 0 && hasFilters) {
    return null;
  }

  return (
    <Menu>
      <Tooltip>
        <MenuTrigger
          render={
            <TooltipTrigger
              render={
                <Button aria-label="Add Filter" size="sm" variant="outline">
                  <ListFilterIcon />
                  Filter
                  {activeFilterIds.length > 0 && (
                    <Badge variant="secondary" className="-me-1">
                      {activeFilterIds.length}
                    </Badge>
                  )}
                </Button>
              }
            />
          }
        />
        <TooltipPopup>Add Filter</TooltipPopup>
      </Tooltip>
      <MenuPopup align="start">
        <MenuGroup>
          <MenuGroupLabel>Filter by</MenuGroupLabel>
          {available.map((field) => (
            <MenuItem
              key={field.id}
              onClick={(): void => onSelectFilter(field.id)}
            >
              {field.label}
            </MenuItem>
          ))}
        </MenuGroup>
      </MenuPopup>
    </Menu>
  );
}

type SavedFilter = {
  id: string;
  isDefault?: boolean;
  label: string;
};

const savedFilters: SavedFilter[] = [
  { id: "my-bookings", isDefault: true, label: "My bookings" },
  { id: "team-meetings", label: "Team meetings" },
  { id: "client-calls", label: "Client calls" },
  { id: "one-on-ones", label: "1:1 meetings" },
  { id: "demo-calls", label: "Demo calls" },
  { id: "interviews", label: "Interviews" },
  { id: "external-meetings", label: "External meetings" },
  { id: "cancelled", label: "Cancelled bookings" },
  { id: "no-show", label: "No-shows" },
  { id: "recurring", label: "Recurring events" },
  { id: "pending-confirmation", label: "Pending confirmation" },
  { id: "this-week", label: "This week" },
];

function SavedFiltersCombobox(): React.ReactElement {
  const [selectedFilter, setSelectedFilter] = useState<SavedFilter | null>(
    null,
  );

  if (!selectedFilter) {
    return (
      <Combobox
        items={savedFilters}
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
          items={savedFilters}
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

function BookingsFilters(): React.ReactElement {
  const { activeFilters, addFilter, updateFilter, removeFilter, clearAll } =
    useActiveFilters();
  const [newlyAddedFilter, setNewlyAddedFilter] = useState<string | null>(null);

  const handleSelectFilter = (fieldId: string): void => {
    const field = filterCategories.find((c) => c.id === fieldId);
    addFilter(fieldId, field?.kind === "text" ? { op: "is" } : undefined);
    setNewlyAddedFilter(fieldId);
  };

  const handleUpdateFilter = (
    columnId: string,
    values: string[],
    op?: TextFilterOperator,
  ): void => {
    updateFilter(columnId, values, op);
  };

  const handleRemoveFilter = (columnId: string): void => {
    removeFilter(columnId);
    if (newlyAddedFilter === columnId) {
      setNewlyAddedFilter(null);
    }
  };

  const hasFilters = activeFilters.length > 0;
  const activeFilterIds = activeFilters.map((f) => f.f);

  return (
    <div className="mt-6 flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <InputGroup className="sm:max-w-[200px]">
            <InputGroupAddon>
              <SearchIcon aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Search"
              placeholder="Search"
              size="sm"
              type="search"
            />
          </InputGroup>
        </div>
        <div className="flex items-center justify-between gap-2">
          <FilterMenu
            activeFilterIds={activeFilterIds}
            fields={filterCategories}
            hasFilters={hasFilters}
            onSelectFilter={handleSelectFilter}
          />
          <SavedFiltersCombobox />
        </div>
      </div>
      {hasFilters && (
        <div className="rounded-xl bg-muted">
          <div className="flex flex-wrap items-start justify-between gap-2 overflow-x-auto p-2">
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((filter) => {
                const field = filterCategories.find((c) => c.id === filter.f);
                if (!field) return null;
                switch (field.kind) {
                  case "text":
                    return (
                      <TextFilterChip
                        autoOpen={newlyAddedFilter === filter.f}
                        field={field}
                        filter={filter}
                        key={filter.f}
                        onRemove={(): void => handleRemoveFilter(filter.f)}
                        onUpdate={(
                          values: string[],
                          op: TextFilterOperator,
                        ): void => handleUpdateFilter(filter.f, values, op)}
                      />
                    );
                  case "dateRange":
                    return (
                      <DateRangeFilterChip
                        autoOpen={newlyAddedFilter === filter.f}
                        field={field}
                        filter={filter}
                        key={filter.f}
                        onRemove={(): void => handleRemoveFilter(filter.f)}
                        onUpdate={(values: string[]): void =>
                          handleUpdateFilter(filter.f, values)
                        }
                      />
                    );
                  case "options":
                    return (
                      <OptionsFilterChip
                        autoOpen={newlyAddedFilter === filter.f}
                        field={field}
                        filter={filter}
                        key={filter.f}
                        onRemove={(): void => handleRemoveFilter(filter.f)}
                        onUpdate={(values: string[]): void =>
                          handleUpdateFilter(filter.f, values)
                        }
                      />
                    );
                  default:
                    return null;
                }
              })}
              {activeFilters.every((f) => {
                const field = filterCategories.find((c) => c.id === f.f);
                if (!field) return false;
                return isActiveFilterComplete(field, f);
              }) &&
                filterCategories.some(
                  (c) => !activeFilterIds.includes(c.id),
                ) && (
                  <Menu>
                    <MenuTrigger
                      render={
                        <Button
                          aria-label="Add filter"
                          size="icon-xs"
                          variant="ghost"
                        />
                      }
                    >
                      <PlusIcon />
                    </MenuTrigger>
                    <MenuPopup align="start">
                      <MenuGroup>
                        <MenuGroupLabel>Filter by</MenuGroupLabel>
                        {filterCategories
                          .filter((c) => !activeFilterIds.includes(c.id))
                          .map((f) => (
                            <MenuItem
                              key={f.id}
                              onClick={(): void => handleSelectFilter(f.id)}
                            >
                              {f.label}
                            </MenuItem>
                          ))}
                      </MenuGroup>
                    </MenuPopup>
                  </Menu>
                )}
            </div>
            <div className="ms-auto flex items-center gap-1">
              <Button onClick={clearAll} size="xs" variant="ghost">
                Clear
              </Button>
              <Button size="xs" variant="outline">
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export type {
  ActiveFilter,
  FilterField,
  FilterOption,
  TextFilterOperator,
} from "./filter-chip-types";
export { BookingsFilters, filterCategories };
