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
import type { LucideIcon } from "lucide-react";
import {
  CalendarIcon,
  ChevronsUpDownIcon,
  ContactRoundIcon,
  HashIcon,
  Link2Icon,
  ListFilterIcon,
  MailIcon,
  SearchIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface FilterOption {
  id: string;
  label: string;
  avatar?: string;
}

export interface FilterCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  options: FilterOption[];
}

export interface ActiveFilter {
  category: FilterCategory;
  selectedOptions: FilterOption[];
}

export const filterCategories: FilterCategory[] = [
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

interface FilterMenuProps {
  hasFilters: boolean;
  onCategorySelect: (category: FilterCategory) => void;
}

function FilterMenu({ hasFilters, onCategorySelect }: FilterMenuProps) {
  const triggerButton = hasFilters ? (
    <Button aria-label="Add filter" size="icon-sm" variant="outline" />
  ) : (
    <Button aria-label="Add filter" size="sm" variant="outline">
      <ListFilterIcon />
      Add filter
    </Button>
  );

  return (
    <Menu>
      <MenuTrigger render={triggerButton}>
        {hasFilters && <ListFilterIcon />}
      </MenuTrigger>
      <MenuPopup align="start">
        <MenuGroup>
          <MenuGroupLabel>Filter by</MenuGroupLabel>
          {filterCategories.map((category) => {
            const Icon = category.icon;
            return (
              <MenuItem
                key={category.id}
                onClick={() => onCategorySelect(category)}
              >
                <Icon className="size-4" />
                {category.label}
              </MenuItem>
            );
          })}
        </MenuGroup>
      </MenuPopup>
    </Menu>
  );
}

interface PendingFilterGroupProps {
  category: FilterCategory;
  onConfirm: (selectedOptions: FilterOption[]) => void;
  onCancel: () => void;
}

function PendingFilterGroup({
  category,
  onConfirm,
  onCancel,
}: PendingFilterGroupProps) {
  const [comboboxOpen, setComboboxOpen] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState<FilterOption[]>([]);
  const isCancelingRef = useRef(false);
  const Icon = category.icon;
  const hasAvatars = selectedOptions.some((opt) => opt.avatar);
  const isSingleSelection = selectedOptions.length === 1;

  useEffect(() => {
    setComboboxOpen(true);
  }, []);

  const handleOpenChange = (
    open: boolean,
    event?: { reason?: string; cancel: () => void },
  ) => {
    if (event?.reason === "item-press") {
      event.cancel();
      return;
    }
    setComboboxOpen(open);
    if (!open && !isCancelingRef.current) {
      if (selectedOptions.length > 0) {
        onConfirm(selectedOptions);
      } else {
        onCancel();
      }
    }
  };

  const handleCancel = () => {
    isCancelingRef.current = true;
    setComboboxOpen(false);
    onCancel();
  };

  const renderSelectedValue = () => {
    if (selectedOptions.length === 0) {
      return (
        <>
          <ChevronsUpDownIcon />
          Select...
        </>
      );
    }
    if (hasAvatars && selectedOptions.length > 1) {
      return (
        <>
          <div className="-space-x-1.5 flex">
            {selectedOptions.slice(0, 3).map((opt) => (
              <Avatar className="size-3.5 ring ring-background" key={opt.id}>
                <AvatarImage alt={opt.label} src={opt.avatar} />
                <AvatarFallback>
                  {opt.label
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          {selectedOptions.length} users
        </>
      );
    }
    if (hasAvatars && isSingleSelection && selectedOptions[0]) {
      return (
        <>
          <Avatar className="size-3.5">
            <AvatarImage
              alt={selectedOptions[0].label}
              src={selectedOptions[0].avatar}
            />
            <AvatarFallback>
              {selectedOptions[0].label
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          {selectedOptions[0].label}
        </>
      );
    }
    if (isSingleSelection && selectedOptions[0]) {
      return selectedOptions[0].label;
    }
    return `${selectedOptions.length} selected`;
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
        <Icon />
        {category.label}
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
        {selectedOptions.length === 0 || isSingleSelection ? "is" : "is any of"}
      </GroupText>
      <GroupSeparator />
      <Combobox
        items={category.options}
        multiple
        onOpenChange={handleOpenChange}
        onValueChange={(newValue) =>
          setSelectedOptions(newValue as FilterOption[])
        }
        open={comboboxOpen}
        value={selectedOptions}
      >
        <ComboboxTrigger render={<Button size="sm" variant="outline" />}>
          {renderSelectedValue()}
        </ComboboxTrigger>
        <ComboboxPopup aria-label={`Select ${category.label}`}>
          <div className="border-b p-2">
            <ComboboxInput
              className="rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
              placeholder={`Search ${category.label.toLowerCase()}...`}
              showTrigger={false}
              startAddon={<SearchIcon />}
            />
          </div>
          <ComboboxEmpty>
            No {category.label.toLowerCase()} found.
          </ComboboxEmpty>
          <ComboboxList>
            {(option: FilterOption) => (
              <ComboboxItem key={option.id} value={option}>
                {option.avatar && (
                  <Avatar className="size-5">
                    <AvatarImage alt={option.label} src={option.avatar} />
                    <AvatarFallback>
                      {option.label
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                )}
                {option.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxPopup>
      </Combobox>
      <GroupSeparator />
      <Button
        aria-label="Remove filter"
        onClick={handleCancel}
        size="icon-sm"
        variant="outline"
      >
        <XIcon />
      </Button>
    </Group>
  );
}

interface FilterGroupProps {
  filter: ActiveFilter;
  onRemove: () => void;
  onUpdate: (selectedOptions: FilterOption[]) => void;
}

function FilterGroup({ filter, onRemove, onUpdate }: FilterGroupProps) {
  const { category, selectedOptions } = filter;
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const Icon = category.icon;
  const hasAvatars = selectedOptions.some((opt) => opt.avatar);
  const isSingleSelection = selectedOptions.length === 1;

  const handleOpenChange = (
    open: boolean,
    event?: { reason?: string; cancel: () => void },
  ) => {
    if (event?.reason === "item-press") {
      event.cancel();
      return;
    }
    setComboboxOpen(open);
  };

  const renderSelectedValue = () => {
    if (hasAvatars && selectedOptions.length > 1) {
      return (
        <>
          <div className="-space-x-1.5 flex">
            {selectedOptions.slice(0, 3).map((opt) => (
              <Avatar className="size-3.5 ring ring-background" key={opt.id}>
                <AvatarImage alt={opt.label} src={opt.avatar} />
                <AvatarFallback>
                  {opt.label
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          {selectedOptions.length} users
        </>
      );
    }
    if (hasAvatars && isSingleSelection && selectedOptions[0]) {
      return (
        <>
          <Avatar className="size-3.5">
            <AvatarImage
              alt={selectedOptions[0].label}
              src={selectedOptions[0].avatar}
            />
            <AvatarFallback>
              {selectedOptions[0].label
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          {selectedOptions[0].label}
        </>
      );
    }
    if (isSingleSelection && selectedOptions[0]) {
      return selectedOptions[0].label;
    }
    return `${selectedOptions.length} selected`;
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
        <Icon />
        {category.label}
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
        {isSingleSelection ? "is" : "is any of"}
      </GroupText>
      <GroupSeparator />
      <Combobox
        items={category.options}
        multiple
        onOpenChange={handleOpenChange}
        onValueChange={(newValue) => {
          const options = newValue as FilterOption[];
          if (options.length === 0) {
            onRemove();
          } else {
            onUpdate(options);
          }
        }}
        open={comboboxOpen}
        value={selectedOptions}
      >
        <ComboboxTrigger render={<Button size="sm" variant="outline" />}>
          {renderSelectedValue()}
        </ComboboxTrigger>
        <ComboboxPopup aria-label={`Edit ${category.label}`}>
          <div className="border-b p-2">
            <ComboboxInput
              className="rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
              placeholder={`Search ${category.label.toLowerCase()}...`}
              showTrigger={false}
              startAddon={<SearchIcon />}
            />
          </div>
          <ComboboxEmpty>
            No {category.label.toLowerCase()} found.
          </ComboboxEmpty>
          <ComboboxList>
            {(option: FilterOption) => (
              <ComboboxItem key={option.id} value={option}>
                {option.avatar && (
                  <Avatar className="size-5">
                    <AvatarImage alt={option.label} src={option.avatar} />
                    <AvatarFallback>
                      {option.label
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                )}
                {option.label}
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

interface BookingsFilterProps {
  activeFilters: ActiveFilter[];
  onFiltersChange: (filters: ActiveFilter[]) => void;
  savedFiltersSlot?: React.ReactNode;
}

function BookingsFilter({
  activeFilters,
  onFiltersChange,
  savedFiltersSlot,
}: BookingsFilterProps) {
  const [pendingCategory, setPendingCategory] = useState<FilterCategory | null>(
    null,
  );

  const hasFilters = activeFilters.length > 0 || pendingCategory !== null;

  const handleCategorySelect = (category: FilterCategory) => {
    const existingFilter = activeFilters.find(
      (f) => f.category.id === category.id,
    );
    if (existingFilter) {
      return;
    }
    setPendingCategory(category);
  };

  const handlePendingConfirm = (selectedOptions: FilterOption[]) => {
    if (pendingCategory && selectedOptions.length > 0) {
      onFiltersChange([
        ...activeFilters,
        { category: pendingCategory, selectedOptions },
      ]);
    }
    setPendingCategory(null);
  };

  const handlePendingCancel = () => {
    setPendingCategory(null);
  };

  const handleFilterUpdate = (
    categoryId: string,
    selectedOptions: FilterOption[],
  ) => {
    onFiltersChange(
      activeFilters.map((f) =>
        f.category.id === categoryId ? { ...f, selectedOptions } : f,
      ),
    );
  };

  const handleRemoveFilter = (categoryId: string) => {
    onFiltersChange(activeFilters.filter((f) => f.category.id !== categoryId));
  };

  const handleClearAll = () => {
    onFiltersChange([]);
    setPendingCategory(null);
  };

  return (
    <div className="mt-6 flex items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <FilterMenu
          hasFilters={hasFilters}
          onCategorySelect={handleCategorySelect}
        />
        {activeFilters.map((filter) => (
          <FilterGroup
            filter={filter}
            key={filter.category.id}
            onRemove={() => handleRemoveFilter(filter.category.id)}
            onUpdate={(options) =>
              handleFilterUpdate(filter.category.id, options)
            }
          />
        ))}
        {pendingCategory && (
          <PendingFilterGroup
            category={pendingCategory}
            key={pendingCategory.id}
            onCancel={handlePendingCancel}
            onConfirm={handlePendingConfirm}
          />
        )}
      </div>
      <div className="flex items-center gap-1">
        {hasFilters && (
          <>
            <Button onClick={handleClearAll} size="sm" variant="ghost">
              Clear
            </Button>
            <Button size="sm" variant="outline">
              Save
            </Button>
          </>
        )}
        {savedFiltersSlot}
      </div>
    </div>
  );
}

export { BookingsFilter };

export type { BookingsFilterProps };
