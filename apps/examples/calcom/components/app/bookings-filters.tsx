"use client";

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
import { cn } from "@coss/ui/lib/utils";
import { ListFilterIcon, SearchIcon, XIcon } from "lucide-react";

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

const allBookings = [...mockPastBookings, ...mockUpcomingBookings];

export const filterCategories = [
  {
    id: "event-type",
    label: "Event Type",
    options: getUniqueEventTypes(allBookings),
  },
  {
    id: "member",
    label: "Member",
    options: getUniqueMembers(allBookings),
  },
  {
    id: "attendees-name",
    label: "Attendees Name",
    options: getUniqueAttendeeNames(allBookings),
  },
  {
    id: "attendee-email",
    label: "Attendee Email",
    options: getUniqueAttendeeEmails(allBookings),
  },
  {
    id: "date-range",
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
    id: "booking-uid",
    label: "Booking UID",
    options: getUniqueBookingUids(allBookings),
  },
];

function FilterMenu({ hasFilters = false }: { hasFilters?: boolean }) {
  const triggerButton = hasFilters ? (
    <Button aria-label="Add filter" size="icon-sm" variant="outline">
      <ListFilterIcon />
    </Button>
  ) : (
    <Button size="sm" variant="outline">
      <ListFilterIcon />
      Add filter
    </Button>
  );

  return (
    <Menu>
      <MenuTrigger render={triggerButton} />
      <MenuPopup align="start">
        <MenuGroup>
          <MenuGroupLabel>Filter by</MenuGroupLabel>
          {filterCategories.map((category) => {
            return <MenuItem key={category.id}>{category.label}</MenuItem>;
          })}
        </MenuGroup>
      </MenuPopup>
    </Menu>
  );
}

function ActiveFilter() {
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
        Label
      </GroupText>
      <GroupSeparator />
      <Combobox multiple>
        <ComboboxTrigger render={<Button size="sm" variant="outline" />}>
          Trigger
        </ComboboxTrigger>
        <ComboboxPopup aria-label="Select items">
          <div className="border-b p-2">
            <ComboboxInput
              className="rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
              placeholder="Search items…"
              showTrigger={false}
              startAddon={<SearchIcon />}
            />
          </div>
          <ComboboxEmpty>No items found.</ComboboxEmpty>
          <ComboboxList>
            {(option) => (
              <ComboboxItem key={option.id} value={option}>
                {option.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxPopup>
      </Combobox>
      <GroupSeparator />
      <Button aria-label="Remove filter" size="icon-sm" variant="outline">
        <XIcon />
      </Button>
    </Group>
  );
}

function BookingsFilters() {
  return (
    <div className="mt-6 flex items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <FilterMenu />
        <ActiveFilter />
      </div>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost">
          Clear
        </Button>
        <Button size="sm" variant="outline">
          Save
        </Button>
      </div>
    </div>
  );
}

export { BookingsFilters };
