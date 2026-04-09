"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@coss/ui/components/input-group";
import { SearchIcon } from "lucide-react";
import type * as React from "react";
import { useState } from "react";
import { FilterAddMenu } from "./filter-add-menu";
import { FilterBarActions } from "./filter-bar-actions";
import { DateRangeFilterChip } from "./filter-chip-date-range";
import { OptionsFilterChip } from "./filter-chip-options";
import { TextFilterChip } from "./filter-chip-text";
import {
  type ActiveFilter,
  type FilterField,
  isActiveFilterComplete,
  type TextFilterOperator,
} from "./filter-chip-types";
import {
  type SavedFilter,
  SavedFiltersCombobox,
} from "./filter-saved-combobox";
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

/** Example saved views — replace with API data in a real screen. */
const bookingsSavedFilters: SavedFilter[] = [
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
          <FilterAddMenu
            activeFilterIds={activeFilterIds}
            fields={filterCategories}
            hasFilters={hasFilters}
            onSelectField={handleSelectFilter}
          />
          <SavedFiltersCombobox filters={bookingsSavedFilters} />
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
                  <FilterAddMenu
                    activeFilterIds={activeFilterIds}
                    fields={filterCategories}
                    hasFilters={hasFilters}
                    onSelectField={handleSelectFilter}
                    variant="icon"
                  />
                )}
            </div>
            <FilterBarActions onClear={clearAll} />
          </div>
        </div>
      )}
    </div>
  );
}

export { BookingsFilters, filterCategories };
