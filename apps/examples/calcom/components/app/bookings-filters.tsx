"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@coss/ui/components/avatar";
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

  useEffect(() => {
    if (autoOpen && !hasAutoOpened.current) {
      setOpen(true);
      hasAutoOpened.current = true;
    }
  }, [autoOpen]);

  const selectedValues = filter.v ?? [];
  const selectedOptions = category.options.filter((opt) =>
    selectedValues.includes(opt.id),
  );

  const getTriggerText = () => {
    if (selectedOptions.length === 0) return "Select";
    if (category.id === "userIds") {
      // For members, we show avatars instead of text
      return null;
    }
    if (selectedOptions.length === 1)
      return selectedOptions[0]?.label ?? "Select";
    return `${selectedOptions.length} selected`;
  };

  const renderMemberAvatars = () => {
    if (category.id !== "userIds" || selectedOptions.length === 0) return null;
    const maxVisible = 3;
    const visibleOptions = selectedOptions.slice(0, maxVisible);
    const remainingCount = selectedOptions.length - maxVisible;

    return (
      <div className="flex items-center">
        <div className="-space-x-2 flex">
          {visibleOptions.map((option) => (
            <Avatar
              className="size-6 border-2 border-background"
              key={option.id}
            >
              {option.avatar ? (
                <AvatarImage alt={option.label} src={option.avatar} />
              ) : null}
              <AvatarFallback className="text-[10px]">
                {getInitials(option.label)}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
        {remainingCount > 0 && (
          <span className="ml-2 text-sm">+{remainingCount}</span>
        )}
      </div>
    );
  };

  const handleValueChange = (
    newValue: FilterOption | FilterOption[] | null,
  ) => {
    if (Array.isArray(newValue)) {
      onUpdate(newValue.map((v) => v.id));
    } else if (newValue) {
      onUpdate([newValue.id]);
    } else {
      onUpdate([]);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
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
        items={category.options}
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
          {category.id === "userIds" && selectedOptions.length > 0
            ? renderMemberAvatars()
            : getTriggerText()}
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
                    <Avatar className="size-6">
                      {option.avatar ? (
                        <AvatarImage alt={option.label} src={option.avatar} />
                      ) : null}
                      <AvatarFallback className="text-[10px]">
                        {getInitials(option.label)}
                      </AvatarFallback>
                    </Avatar>
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
        <Button size="sm" variant="outline">
          Saved Filters
          <ChevronsUpDownIcon />
        </Button>
      </div>
    </div>
  );
}

export { BookingsFilters };
