"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@coss/ui/components/avatar";
import { Badge } from "@coss/ui/components/badge";
import { Button, buttonVariants } from "@coss/ui/components/button";
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxTrigger,
} from "@coss/ui/components/combobox";
import { Group, GroupSeparator, GroupText } from "@coss/ui/components/group";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from "@coss/ui/components/menu";
import { Separator } from "@coss/ui/components/separator";
import { cn } from "@coss/ui/lib/utils";
import {
  ChevronsUpDownIcon,
  FunnelIcon,
  ListFilterIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

function getUniqueEventTypes(bookings: Booking[]) {
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

function getUniqueMembers(bookings: Booking[]) {
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

function getUniqueAttendeeNames(bookings: Booking[]) {
  const attendeeMap = new Map<string, { id: string; label: string }>();
  for (const booking of bookings) {
    for (const attendee of booking.attendees) {
      const id = toKebabCase(attendee.name);
      if (!attendeeMap.has(id)) {
        attendeeMap.set(id, {
          id,
          label: attendee.name,
        });
      }
    }
  }
  return Array.from(attendeeMap.values()).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
}

function getUniqueAttendeeEmails(bookings: Booking[]) {
  const emailMap = new Map<string, { id: string; label: string }>();
  for (const booking of bookings) {
    for (const attendee of booking.attendees) {
      const id = toKebabCase(attendee.email.split("@")[0] ?? attendee.email);
      if (!emailMap.has(attendee.email)) {
        emailMap.set(attendee.email, {
          id,
          label: attendee.email,
        });
      }
    }
  }
  return Array.from(emailMap.values()).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
}

function getUniqueBookingUids(bookings: Booking[]) {
  return bookings
    .map((booking) => ({
      id: toKebabCase(booking.uid),
      label: booking.uid,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0]?.charAt(0).toUpperCase() ?? "";
  }
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts[parts.length - 1]?.charAt(0) ?? "";
  return (first + last).toUpperCase();
}

function CountBadge({ count }: { count: number }) {
  return (
    <Badge className="tabular-nums" variant="secondary">
      +{count}
    </Badge>
  );
}

function SelectionDisplay({
  children,
  label,
  remainingCount,
}: {
  children?: React.ReactNode;
  label: string;
  remainingCount: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {children}
      <span className="truncate">{label}</span>
      {remainingCount > 0 && <CountBadge count={remainingCount} />}
    </div>
  );
}

function MemberAvatar({
  name,
  avatarUrl,
  className,
}: {
  name: string;
  avatarUrl?: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn("size-5", className)}>
      {avatarUrl ? <AvatarImage alt={name} src={avatarUrl} /> : null}
      <AvatarFallback className="text-[0.5rem]">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

const allBookings = [...mockPastBookings, ...mockUpcomingBookings];

export type FilterOption = {
  id: string;
  label: string;
  avatar?: string | null;
};

export type FilterCategory = {
  id: string;
  label: string;
  options: FilterOption[];
};

export type ActiveFilter = {
  f: string;
  v?: string[];
};

export const filterCategories: FilterCategory[] = [
  {
    id: "eventTypeId",
    label: "Event Type",
    options: getUniqueEventTypes(allBookings),
  },
  {
    id: "userIds",
    label: "Member",
    options: getUniqueMembers(allBookings),
  },
  {
    id: "attendeesName",
    label: "Attendees Name",
    options: getUniqueAttendeeNames(allBookings),
  },
  {
    id: "attendeeEmail",
    label: "Attendee Email",
    options: getUniqueAttendeeEmails(allBookings),
  },
  {
    id: "dateRange",
    label: "Date Range",
    options: [
      { id: "today", label: "Today" },
      { id: "yesterday", label: "Yesterday" },
      { id: "this-week", label: "This Week" },
      { id: "last-week", label: "Last Week" },
      { id: "this-month", label: "This Month" },
      { id: "last-month", label: "Last Month" },
      { id: "custom", label: "Custom Range" },
    ],
  },
  {
    id: "bookingUid",
    label: "Booking UID",
    options: getUniqueBookingUids(allBookings),
  },
];

function useActiveFilters() {
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  const addFilter = (columnId: string) => {
    if (!activeFilters.some((filter) => filter.f === columnId)) {
      setActiveFilters([...activeFilters, { f: columnId }]);
    }
  };

  const updateFilter = (columnId: string, values: string[]) => {
    setActiveFilters((prev) => {
      const exists = prev.some((filter) => filter.f === columnId);
      if (exists) {
        return prev.map((filter) =>
          filter.f === columnId ? { ...filter, v: values } : filter,
        );
      }
      return [...prev, { f: columnId, v: values }];
    });
  };

  const removeFilter = (columnId: string) => {
    setActiveFilters((prev) => prev.filter((filter) => filter.f !== columnId));
  };

  const clearAll = () => {
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
  hasFilters = false,
  onSelectFilter,
  activeFilterIds,
}: {
  hasFilters?: boolean;
  onSelectFilter: (categoryId: string) => void;
  activeFilterIds: string[];
}) {
  const availableCategories = filterCategories.filter(
    (category) => !activeFilterIds.includes(category.id),
  );

  if (availableCategories.length === 0 && hasFilters) {
    return null;
  }

  return (
    <Menu>
      <MenuTrigger render={<Button size="sm" variant="outline" />}>
        <ListFilterIcon />
        Add Filter
      </MenuTrigger>
      <MenuPopup align="start">
        <MenuGroup>
          <MenuGroupLabel>Filter by</MenuGroupLabel>
          {availableCategories.map((category) => (
            <MenuItem
              key={category.id}
              onClick={() => onSelectFilter(category.id)}
            >
              {category.label}
            </MenuItem>
          ))}
        </MenuGroup>
      </MenuPopup>
    </Menu>
  );
}

function ActiveFilterComponent({
  filter,
  category,
  onUpdate,
  onRemove,
  autoOpen = false,
}: {
  filter: ActiveFilter;
  category: FilterCategory;
  onUpdate: (values: string[]) => void;
  onRemove: () => void;
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);
  const hasAutoOpened = useRef(false);
  // Snapshot of sorted items when combobox opens (selected first)
  const [sortedItems, setSortedItems] = useState<FilterOption[]>(
    category.options,
  );

  useEffect(() => {
    if (autoOpen && !hasAutoOpened.current) {
      setOpen(true);
      hasAutoOpened.current = true;
    }
  }, [autoOpen]);

  const selectedValues = filter.v ?? [];
  // Get selected options in the order they were selected (based on filter.v order)
  const selectedOptions = selectedValues
    .map((id) => category.options.find((opt) => opt.id === id))
    .filter((opt): opt is FilterOption => opt !== undefined);

  const renderTriggerContent = () => {
    if (selectedOptions.length === 0) return "Select";
    const firstOption = selectedOptions[0];
    const remainingCount = selectedOptions.length - 1;

    // For members, show avatar + name + badge
    if (category.id === "userIds") {
      return (
        <SelectionDisplay
          label={firstOption?.label ?? ""}
          remainingCount={remainingCount}
        >
          <MemberAvatar
            avatarUrl={firstOption?.avatar}
            name={firstOption?.label ?? ""}
          />
        </SelectionDisplay>
      );
    }

    // For other filters, show text + badge
    if (remainingCount > 0) {
      return (
        <SelectionDisplay
          label={firstOption?.label ?? ""}
          remainingCount={remainingCount}
        />
      );
    }

    return firstOption?.label ?? "Select";
  };

  const handleValueChange = (
    newValue: FilterOption | FilterOption[] | null,
  ) => {
    if (Array.isArray(newValue)) {
      // Maintain selection order: keep existing selections in order, append new ones
      const newIds = newValue.map((v) => v.id);
      const existingIds = selectedValues.filter((id) => newIds.includes(id));
      const addedIds = newIds.filter((id) => !selectedValues.includes(id));
      onUpdate([...existingIds, ...addedIds]);
    } else if (newValue) {
      onUpdate([newValue.id]);
    } else {
      onUpdate([]);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      // When opening, sort items: selected first, then unselected
      const selected = category.options.filter((opt) =>
        selectedValues.includes(opt.id),
      );
      const unselected = category.options.filter(
        (opt) => !selectedValues.includes(opt.id),
      );
      setSortedItems([...selected, ...unselected]);
    }
    // Remove filter if combobox closes with no selection
    if (!isOpen && selectedValues.length === 0) {
      onRemove();
    }
  };

  return (
    <Group>
      <GroupText
        className={cn(
          buttonVariants({
            size: "sm",
            variant: "outline",
          }),
          "pointer-events-none",
        )}
      >
        <FunnelIcon />
        {category.label}
      </GroupText>
      <GroupSeparator />
      <Combobox
        autoHighlight
        items={sortedItems}
        multiple
        onOpenChange={handleOpenChange}
        onValueChange={handleValueChange}
        open={open}
        value={selectedOptions}
      >
        <ComboboxTrigger
          render={
            <Button
              className={
                selectedOptions.length === 0 ? "justify-between" : undefined
              }
              size="sm"
              variant="outline"
            />
          }
        >
          {renderTriggerContent()}
          {selectedOptions.length === 0 && (
            <ChevronsUpDownIcon className="-me-1!" />
          )}
        </ComboboxTrigger>
        <ComboboxPopup aria-label={`Select ${category.label}`}>
          <div className="border-b p-2">
            <ComboboxInput
              className="rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
              placeholder={`Search ${category.label.toLowerCase()}…`}
              showTrigger={false}
              startAddon={<SearchIcon />}
            />
          </div>
          <ComboboxEmpty>No items found.</ComboboxEmpty>
          <ComboboxList>
            {(option: FilterOption) => (
              <ComboboxItem key={option.id} value={option}>
                {category.id === "userIds" ? (
                  <div className="flex items-center gap-2">
                    <MemberAvatar
                      avatarUrl={option.avatar}
                      name={option.label}
                    />
                    <span>{option.label}</span>
                  </div>
                ) : (
                  option.label
                )}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxPopup>
      </Combobox>
      <GroupSeparator />
      <Button
        aria-label="Remove filter"
        onClick={onRemove}
        size="icon-sm"
        variant="outline"
      >
        <XIcon />
      </Button>
    </Group>
  );
}

function BookingsFilters() {
  const { activeFilters, addFilter, updateFilter, removeFilter, clearAll } =
    useActiveFilters();
  const [newlyAddedFilter, setNewlyAddedFilter] = useState<string | null>(null);

  const handleSelectFilter = (categoryId: string) => {
    addFilter(categoryId);
    setNewlyAddedFilter(categoryId);
  };

  const handleUpdateFilter = (columnId: string, values: string[]) => {
    updateFilter(columnId, values);
  };

  const handleRemoveFilter = (columnId: string) => {
    removeFilter(columnId);
    if (newlyAddedFilter === columnId) {
      setNewlyAddedFilter(null);
    }
  };

  const hasFilters = activeFilters.length > 0;
  const activeFilterIds = activeFilters.map((f) => f.f);

  return (
    <div className="mt-6 flex items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <FilterMenu
          activeFilterIds={activeFilterIds}
          hasFilters={hasFilters}
          onSelectFilter={handleSelectFilter}
        />
        {activeFilters.map((filter) => {
          const category = filterCategories.find((c) => c.id === filter.f);
          if (!category) return null;
          return (
            <ActiveFilterComponent
              autoOpen={newlyAddedFilter === filter.f}
              category={category}
              filter={filter}
              key={filter.f}
              onRemove={() => handleRemoveFilter(filter.f)}
              onUpdate={(values) => handleUpdateFilter(filter.f, values)}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        {hasFilters && (
          <>
            <div className="flex items-center gap-1">
              <Button onClick={clearAll} size="sm" variant="ghost">
                Clear
              </Button>
              <Button size="sm" variant="outline">
                Save
              </Button>
            </div>
            <Separator className="my-1" orientation="vertical" />
          </>
        )}
        <SavedFiltersCombobox />
      </div>
    </div>
  );
}

type SavedFilter = {
  id: string;
  label: string;
};

const savedFilters: SavedFilter[] = [
  { id: "my-bookings", label: "My bookings" },
];

function SavedFiltersCombobox() {
  const [selectedFilter, setSelectedFilter] = useState<SavedFilter | null>(
    null,
  );

  return (
    <Combobox
      items={savedFilters}
      onValueChange={setSelectedFilter}
      value={selectedFilter}
    >
      <ComboboxTrigger render={<Button size="sm" variant="outline" />}>
        {selectedFilter?.label ?? "Saved Filters"}
        <ChevronsUpDownIcon />
      </ComboboxTrigger>
      <ComboboxPopup align="end" aria-label="Select saved filter">
        <div className="border-b p-2">
          <ComboboxInput
            className="rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
            placeholder="Search saved filters…"
            showTrigger={false}
            startAddon={<SearchIcon />}
          />
        </div>
        <ComboboxEmpty>No saved filters.</ComboboxEmpty>
        <ComboboxList>
          {(filter: SavedFilter) => (
            <ComboboxItem key={filter.id} value={filter}>
              {filter.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxPopup>
    </Combobox>
  );
}

export { BookingsFilters };
