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
import { cn } from "@coss/ui/lib/utils";
import {
  ContactRoundIcon,
  Link2Icon,
  ListFilterIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { useState } from "react";

// Filter category types
interface FilterOption {
  id: string;
  label: string;
}

interface FilterCategory {
  id: string;
  label: string;
  options: FilterOption[];
}

// Sample filter data
const filterCategories: FilterCategory[] = [
  {
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
    id: "member",
    label: "Member",
    options: [
      { id: "john-doe", label: "John Doe" },
      { id: "jane-smith", label: "Jane Smith" },
      { id: "mike-johnson", label: "Mike Johnson" },
      { id: "sarah-williams", label: "Sarah Williams" },
      { id: "alex-brown", label: "Alex Brown" },
    ],
  },
  {
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
    options: [
      { id: "uid-1", label: "BK-001-2026" },
      { id: "uid-2", label: "BK-002-2026" },
      { id: "uid-3", label: "BK-003-2026" },
      { id: "uid-4", label: "BK-004-2026" },
    ],
  },
];

function FilterMenu() {
  const [selectedCategory, setSelectedCategory] =
    useState<FilterCategory | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);

  // If a category is selected, show the second level combobox (matching p-combobox-10.tsx exactly)
  if (selectedCategory) {
    return (
      <Combobox
        items={selectedCategory.options}
        multiple
        onOpenChange={(open, event) => {
          if (event?.reason === "item-press") {
            event.cancel();
            return;
          }
          setComboboxOpen(open);
          if (!open) {
            setSelectedCategory(null);
          }
        }}
        open={comboboxOpen}
      >
        <ComboboxTrigger
          render={
            <Button aria-label="Add filter" size="icon-sm" variant="ghost" />
          }
        >
          <ListFilterIcon />
        </ComboboxTrigger>
        <ComboboxPopup aria-label={`Select ${selectedCategory.label}`}>
          <div className="border-b p-2">
            <ComboboxInput
              className="rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
              placeholder={`Search ${selectedCategory.label.toLowerCase()}...`}
              showTrigger={false}
              startAddon={<SearchIcon />}
            />
          </div>
          <ComboboxEmpty>
            No {selectedCategory.label.toLowerCase()} found.
          </ComboboxEmpty>
          <ComboboxList>
            {(option: FilterOption) => (
              <ComboboxItem key={option.id} value={option}>
                {option.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxPopup>
      </Combobox>
    );
  }

  // First level: menu with groups (following p-menu-6.tsx pattern)
  return (
    <Menu onOpenChange={setMenuOpen} open={menuOpen}>
      <MenuTrigger
        render={
          <Button aria-label="Add filter" size="icon-sm" variant="ghost" />
        }
      >
        <ListFilterIcon />
      </MenuTrigger>
      <MenuPopup align="start">
        <MenuGroup>
          <MenuGroupLabel>Filter by</MenuGroupLabel>
          {filterCategories.map((category) => (
            <MenuItem
              key={category.id}
              onClick={() => {
                setSelectedCategory(category);
                setMenuOpen(false);
                setTimeout(() => setComboboxOpen(true), 0);
              }}
            >
              {category.label}
            </MenuItem>
          ))}
        </MenuGroup>
      </MenuPopup>
    </Menu>
  );
}

function BookingsFilter() {
  return (
    <div className="mt-6 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
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
            <Link2Icon />
            Event Type
          </GroupText>
          <GroupSeparator />
          <GroupText
            className={cn(
              buttonVariants({
                size: "sm",
                variant: "outline",
              }),
              "pointer-events-none text-muted-foreground",
            )}
          >
            is
          </GroupText>
          <GroupSeparator />
          <Button size="sm" variant="outline">
            15 Min Meeting
          </Button>
          <GroupSeparator />
          <Button aria-label="Remove filter" size="icon-sm" variant="outline">
            <XIcon />
          </Button>
        </Group>
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
            <ContactRoundIcon />
            Member
          </GroupText>
          <GroupSeparator />
          <GroupText
            className={cn(
              buttonVariants({
                size: "sm",
                variant: "outline",
              }),
              "pointer-events-none text-muted-foreground",
            )}
          >
            is any of
          </GroupText>
          <GroupSeparator />
          <Button size="sm" variant="outline">
            <div className="-space-x-1.5 flex">
              <Avatar className="size-3.5 ring ring-background">
                <AvatarImage
                  alt="U1"
                  src="https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=72&h=72&dpr=2&q=80"
                />
                <AvatarFallback>U1</AvatarFallback>
              </Avatar>
              <Avatar className="size-3.5 ring ring-background">
                <AvatarImage
                  alt="U2"
                  src="https://images.unsplash.com/photo-1628157588553-5eeea00af15c?w=72&h=72&dpr=2&q=80"
                />
                <AvatarFallback>U2</AvatarFallback>
              </Avatar>
              <Avatar className="size-3.5 ring ring-background">
                <AvatarImage
                  alt="U3"
                  src="https://images.unsplash.com/photo-1655874819398-c6dfbec68ac7?w=72&h=72&dpr=2&q=80"
                />
                <AvatarFallback>U3</AvatarFallback>
              </Avatar>
            </div>
            3 users
          </Button>
          <GroupSeparator />
          <Button aria-label="Remove filter" size="icon-sm" variant="outline">
            <XIcon />
          </Button>
        </Group>
        <FilterMenu />
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

export { BookingsFilter };
