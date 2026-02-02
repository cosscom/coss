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
import {
  CalendarIcon,
  ContactRoundIcon,
  HashIcon,
  Link2Icon,
  ListFilterIcon,
  MailIcon,
  SearchIcon,
  UserIcon,
  XIcon,
} from "lucide-react";

export const filterCategories = [
  {
    icon: Link2Icon,
    id: "event-type",
    label: "Event Type",
    options: [
      { id: "15-min", label: "15 Min Meeting" },
      { id: "30-min", label: "30 Min Meeting" },
      { id: "60-min", label: "60 Min Meeting" },
      { id: "consultation", label: "Consultation" },
      { id: "interview", label: "Interview" },
      { id: "onboarding", label: "Onboarding Call" },
    ],
  },
  {
    icon: ContactRoundIcon,
    id: "member",
    label: "Member",
    options: [
      {
        avatar:
          "https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=72&h=72&dpr=2&q=80",
        id: "john-doe",
        label: "John Doe",
      },
      {
        avatar:
          "https://images.unsplash.com/photo-1628157588553-5eeea00af15c?w=72&h=72&dpr=2&q=80",
        id: "jane-smith",
        label: "Jane Smith",
      },
      {
        avatar:
          "https://images.unsplash.com/photo-1655874819398-c6dfbec68ac7?w=72&h=72&dpr=2&q=80",
        id: "mike-johnson",
        label: "Mike Johnson",
      },
      {
        avatar:
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=72&h=72&dpr=2&q=80",
        id: "sarah-williams",
        label: "Sarah Williams",
      },
      {
        avatar:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=72&h=72&dpr=2&q=80",
        id: "alex-brown",
        label: "Alex Brown",
      },
    ],
  },
  {
    icon: UserIcon,
    id: "attendees-name",
    label: "Attendees Name",
    options: [
      { id: "alice-cooper", label: "Alice Cooper" },
      { id: "bob-martin", label: "Bob Martin" },
      { id: "carol-white", label: "Carol White" },
      { id: "david-lee", label: "David Lee" },
      { id: "emma-davis", label: "Emma Davis" },
    ],
  },
  {
    icon: MailIcon,
    id: "attendee-email",
    label: "Attendee Email",
    options: [
      { id: "alice-email", label: "alice@example.com" },
      { id: "bob-email", label: "bob@company.com" },
      { id: "carol-email", label: "carol@business.org" },
      { id: "david-email", label: "david@startup.io" },
    ],
  },
  {
    icon: CalendarIcon,
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
    icon: HashIcon,
    id: "booking-uid",
    label: "Booking UID",
    options: [
      { id: "uid-1", label: "BK-001-2026" },
      { id: "uid-2", label: "BK-002-2026" },
      { id: "uid-3", label: "BK-003-2026" },
      { id: "uid-4", label: "BK-004-2026" },
    ],
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
            const Icon = category.icon;
            return (
              <MenuItem key={category.id}>
                <Icon />
                {category.label}
              </MenuItem>
            );
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
