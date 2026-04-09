"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@coss/ui/components/avatar";
import { Badge } from "@coss/ui/components/badge";
import { Button, buttonVariants } from "@coss/ui/components/button";
import { Calendar } from "@coss/ui/components/calendar";
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
import { Input } from "@coss/ui/components/input";
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
import {
  Popover,
  PopoverPopup,
  PopoverTrigger,
} from "@coss/ui/components/popover";
import {
  Select,
  SelectButton,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@coss/ui/components/select";
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import { cn } from "@coss/ui/lib/utils";
import {
  ChevronsUpDownIcon,
  CopyIcon,
  EllipsisIcon,
  ListFilterIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  XIcon,
} from "lucide-react";
import type * as React from "react";
import { useEffect, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";
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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0]?.charAt(0).toUpperCase() ?? "";
  }
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts[parts.length - 1]?.charAt(0) ?? "";
  return (first + last).toUpperCase();
}

function subDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() - days);
  return next;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function daysSinceMonday(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function startOfWeekMonday(date: Date): Date {
  return startOfDay(subDays(date, daysSinceMonday(date)));
}

function endOfWeekMonday(date: Date): Date {
  const start = startOfWeekMonday(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return endOfDay(end);
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateStr(s: string): Date | null {
  const parts = s.split("-");
  if (parts.length !== 3) {
    return null;
  }
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) {
    return null;
  }
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

function valuesToRange(v: string[] | undefined): DateRange | undefined {
  const fromStr = v?.[0];
  const toStr = v?.[1];
  if (!fromStr || !toStr) {
    return undefined;
  }
  const from = parseDateStr(fromStr);
  const to = parseDateStr(toStr);
  if (!from || !to) {
    return undefined;
  }
  return { from, to };
}

function rangeToValues(range: DateRange | undefined): string[] {
  if (!range?.from || !range?.to) {
    return [];
  }
  return [toDateStr(range.from), toDateStr(range.to)];
}

function rangeMatchesPreset(
  committed: DateRange | undefined,
  presetFrom: Date,
  presetTo: Date,
): boolean {
  if (!committed?.from || !committed?.to) {
    return false;
  }
  return (
    toDateStr(committed.from) === toDateStr(presetFrom) &&
    toDateStr(committed.to) === toDateStr(presetTo)
  );
}

type DateRangePreset = {
  focusMonth: Date;
  label: string;
  range: DateRange;
  value: string;
};

function inferDatePresetId(
  committed: DateRange | undefined,
  presets: ReadonlyArray<DateRangePreset>,
): string | null {
  if (!committed?.from || !committed?.to) {
    return null;
  }
  for (const p of presets) {
    if (
      p.range.from &&
      p.range.to &&
      rangeMatchesPreset(committed, p.range.from, p.range.to)
    ) {
      return p.value;
    }
  }
  return null;
}

function dateRangeTriggerLabel(
  committed: DateRange | undefined,
  presets: DateRangePreset[],
): string {
  if (!committed?.from || !committed?.to) {
    return "Select";
  }
  const id = inferDatePresetId(committed, presets);
  if (id) {
    const preset = presets.find((p) => p.value === id);
    if (preset) {
      return preset.label;
    }
  }
  return formatRangeLabel(committed);
}

function formatRangeLabel(range: DateRange): string {
  const fmt = (d: Date): string =>
    new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  if (!range.from) {
    return "";
  }
  if (!range.to) {
    return fmt(range.from);
  }
  return `${fmt(range.from)} – ${fmt(range.to)}`;
}

function CountBadge({ count }: { count: number }): React.ReactElement {
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
}): React.ReactElement {
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
}): React.ReactElement {
  return (
    <Avatar className={cn("size-4", className)}>
      {avatarUrl ? <AvatarImage alt={name} src={avatarUrl} /> : null}
      <AvatarFallback className="text-[0.5rem]">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

const allBookings: Booking[] = [...mockPastBookings, ...mockUpcomingBookings];

type TextFilterOperator =
  | "contains"
  | "does-not-contain"
  | "ends-with"
  | "is"
  | "is-empty"
  | "is-not"
  | "not-empty"
  | "starts-with";

const TEXT_FILTER_OPERATORS: { label: string; value: TextFilterOperator }[] = [
  { label: "is", value: "is" },
  { label: "is not", value: "is-not" },
  { label: "contains", value: "contains" },
  { label: "does not contain", value: "does-not-contain" },
  { label: "starts with", value: "starts-with" },
  { label: "ends with", value: "ends-with" },
  { label: "is empty", value: "is-empty" },
  { label: "not empty", value: "not-empty" },
];

const textFilterSelectItems: { label: string; value: TextFilterOperator }[] =
  TEXT_FILTER_OPERATORS.map(({ label, value }) => ({
    label,
    value,
  }));

function textOperatorNeedsValue(op: TextFilterOperator): boolean {
  return op !== "is-empty" && op !== "not-empty";
}

function textFilterOperatorLabel(op: TextFilterOperator): string {
  return TEXT_FILTER_OPERATORS.find((o) => o.value === op)?.label ?? "is";
}

function isTextFilterComplete(filter: ActiveFilter): boolean {
  const op = filter.op ?? "is";
  if (!textOperatorNeedsValue(op)) {
    return true;
  }
  return Boolean(filter.v?.[0]?.trim());
}

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
  hasFilters = false,
  onSelectFilter,
  activeFilterIds,
}: {
  hasFilters?: boolean;
  onSelectFilter: (categoryId: string) => void;
  activeFilterIds: string[];
}): React.ReactElement | null {
  const availableCategories = filterCategories.filter(
    (category) => !activeFilterIds.includes(category.id),
  );

  if (availableCategories.length === 0 && hasFilters) {
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
          {availableCategories.map((category) => (
            <MenuItem
              key={category.id}
              onClick={(): void => onSelectFilter(category.id)}
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
}): React.ReactElement {
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

  const renderTriggerContent = (): string | React.ReactElement => {
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
  ): void => {
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

  const handleOpenChange = (isOpen: boolean): void => {
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
    if (!isOpen && selectedValues.length === 0) {
      onRemove();
    }
  };

  return (
    <Group>
      <GroupText
        className={cn(
          buttonVariants({
            size: "xs",
            variant: "outline",
          }),
          "pointer-events-none",
        )}
      >
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
        <ComboboxTrigger render={<Button size="xs" variant="outline" />}>
          {renderTriggerContent()}
          {selectedOptions.length === 0 && (
            <ChevronsUpDownIcon className="-me-1!" />
          )}
        </ComboboxTrigger>
        <ComboboxPopup aria-label={`Select ${category.label}`}>
          <div className="border-b p-2">
            <ComboboxInput
              size="sm"
              className="rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
              placeholder={`Search ${category.label.toLowerCase()}`}
              showTrigger={false}
              startAddon={<SearchIcon />}
            />
          </div>
          <ComboboxEmpty>No items found.</ComboboxEmpty>
          <ComboboxList>
            {(option: FilterOption): React.ReactElement => (
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
          {selectedOptions.length > 0 && (
            <div className="border-t p-2">
              <Button
                className="w-full"
                onClick={(): void => onUpdate([])}
                size="sm"
                variant="outline"
              >
                Clear all
              </Button>
            </div>
          )}
        </ComboboxPopup>
      </Combobox>
      <GroupSeparator />
      <Button
        aria-label="Remove filter"
        onClick={onRemove}
        size="icon-xs"
        variant="outline"
      >
        <XIcon />
      </Button>
    </Group>
  );
}

function DateRangeActiveFilter({
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
}): React.ReactElement {
  const [open, setOpen] = useState(autoOpen);
  const hasAutoOpened = useRef(false);
  const today = new Date();
  const yesterday = subDays(today, 1);
  const thisWeekStart = startOfWeekMonday(today);
  const thisWeekEnd = endOfWeekMonday(today);
  const lastWeekStart = startOfWeekMonday(subDays(today, 7));
  const lastWeekEnd = endOfWeekMonday(subDays(today, 7));
  const thisMonthStart = startOfDay(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const thisMonthEnd = endOfDay(
    new Date(today.getFullYear(), today.getMonth() + 1, 0),
  );
  const lastMonthStart = startOfDay(
    new Date(today.getFullYear(), today.getMonth() - 1, 1),
  );
  const lastMonthEnd = endOfDay(
    new Date(today.getFullYear(), today.getMonth(), 0),
  );

  const committedRange = valuesToRange(filter.v);
  const [month, setMonth] = useState<Date>(
    committedRange?.to ?? committedRange?.from ?? today,
  );
  const [range, setRange] = useState<DateRange | undefined>(committedRange);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  const presets: DateRangePreset[] = [
    {
      value: "today",
      label: "Today",
      range: { from: startOfDay(today), to: endOfDay(today) },
      focusMonth: today,
    },
    {
      value: "yesterday",
      label: "Yesterday",
      range: {
        from: startOfDay(yesterday),
        to: endOfDay(yesterday),
      },
      focusMonth: yesterday,
    },
    {
      value: "this-week",
      label: "This week",
      range: { from: thisWeekStart, to: thisWeekEnd },
      focusMonth: thisWeekEnd,
    },
    {
      value: "last-week",
      label: "Last week",
      range: { from: lastWeekStart, to: lastWeekEnd },
      focusMonth: lastWeekEnd,
    },
    {
      value: "this-month",
      label: "This month",
      range: { from: thisMonthStart, to: thisMonthEnd },
      focusMonth: thisMonthEnd,
    },
    {
      value: "last-month",
      label: "Last month",
      range: { from: lastMonthStart, to: lastMonthEnd },
      focusMonth: lastMonthEnd,
    },
  ];

  useEffect(() => {
    if (autoOpen && !hasAutoOpened.current) {
      setOpen(true);
      hasAutoOpened.current = true;
    }
  }, [autoOpen]);

  const applyRange = (next: DateRange | undefined): void => {
    setRange(next);
    const values = rangeToValues(next);
    if (values.length === 2) {
      onUpdate(values);
    }
  };

  const handleOpenChange = (isOpen: boolean): void => {
    setOpen(isOpen);
    if (isOpen) {
      const next = valuesToRange(filter.v);
      setRange(next);
      setMonth(next?.to ?? next?.from ?? today);
      setSelectedPresetId(inferDatePresetId(next, presets));
    } else if (!filter.v || filter.v.length < 2) {
      onRemove();
    }
  };

  return (
    <Group>
      <GroupText
        className={cn(
          buttonVariants({
            size: "xs",
            variant: "outline",
          }),
          "pointer-events-none",
        )}
      >
        {category.label}
      </GroupText>
      <GroupSeparator />
      <Popover onOpenChange={handleOpenChange} open={open}>
        <PopoverTrigger
          render={
            <Button
              className={!committedRange ? "justify-between" : undefined}
              size="xs"
              variant="outline"
            />
          }
        >
          {dateRangeTriggerLabel(committedRange, presets)}
          {!committedRange && <ChevronsUpDownIcon className="-me-1!" />}
        </PopoverTrigger>
        <PopoverPopup
          align="start"
          className="p-0 transition-none"
          portalProps={{
            className: "*:data-[slot=popover-positioner]:transition-none",
          }}
        >
          <div className="flex max-sm:flex-col">
            <div className="relative py-1 ps-1 max-sm:order-1 max-sm:border-t">
              <div className="flex h-full flex-col gap-0.5 sm:border-e sm:pe-3">
                {presets.map((preset) => (
                  <Button
                    className="w-full justify-start"
                    data-pressed={
                      selectedPresetId === preset.value ? "" : undefined
                    }
                    key={preset.value}
                    onClick={(): void => {
                      setSelectedPresetId(preset.value);
                      applyRange(preset.range);
                      setMonth(preset.focusMonth);
                      setOpen(false);
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
            <Calendar
              className="max-sm:pb-3 sm:ps-2"
              mode="range"
              month={month}
              numberOfMonths={1}
              onMonthChange={setMonth}
              onSelect={(next: DateRange | undefined): void => {
                setSelectedPresetId(null);
                setRange(next);
                if (next?.from && next.to) {
                  onUpdate(rangeToValues(next));
                }
              }}
              selected={range}
            />
          </div>
        </PopoverPopup>
      </Popover>
      <GroupSeparator />
      <Button
        aria-label="Remove filter"
        onClick={onRemove}
        size="icon-xs"
        variant="outline"
      >
        <XIcon />
      </Button>
    </Group>
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

  // When no filter is selected, show just the combobox trigger
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
              size="sm"
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
        </ComboboxPopup>
      </Combobox>
    );
  }

  // When a filter is selected, show Group with combobox and X button, plus edit menu outside
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

type FilterOption = {
  id: string;
  label: string;
  avatar?: string | null;
};

type FilterCategory = {
  id: string;
  kind?: "options" | "text";
  label: string;
  options: FilterOption[];
};

type ActiveFilter = {
  f: string;
  op?: TextFilterOperator;
  v?: string[];
};

const filterCategories: FilterCategory[] = [
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
    kind: "text",
    label: "Attendees Name",
    options: [],
  },
  {
    id: "attendeeEmail",
    kind: "text",
    label: "Attendee Email",
    options: [],
  },
  {
    id: "dateRange",
    label: "Date Range",
    options: [],
  },
  {
    id: "bookingUid",
    kind: "text",
    label: "Booking UID",
    options: [],
  },
];

function TextFilterActiveFilter({
  filter,
  category,
  onUpdate,
  onRemove,
  autoOpen = false,
}: {
  filter: ActiveFilter;
  category: FilterCategory;
  onUpdate: (values: string[], op: TextFilterOperator) => void;
  onRemove: () => void;
  autoOpen?: boolean;
}): React.ReactElement {
  const [open, setOpen] = useState(autoOpen);
  const hasAutoOpened = useRef(false);
  const [draftOp, setDraftOp] = useState<TextFilterOperator>(
    () => (filter.op ?? "is") as TextFilterOperator,
  );
  const [draftValue, setDraftValue] = useState(() => filter.v?.[0] ?? "");

  useEffect(() => {
    if (autoOpen && !hasAutoOpened.current) {
      setOpen(true);
      hasAutoOpened.current = true;
    }
  }, [autoOpen]);

  const handleOpenChange = (isOpen: boolean): void => {
    setOpen(isOpen);
    if (isOpen) {
      setDraftOp((filter.op ?? "is") as TextFilterOperator);
      setDraftValue(filter.v?.[0] ?? "");
    } else if (!isTextFilterComplete(filter)) {
      onRemove();
    }
  };

  const applyDisabled =
    textOperatorNeedsValue(draftOp) && draftValue.trim().length === 0;

  const handleApply = (): void => {
    if (applyDisabled) {
      return;
    }
    if (textOperatorNeedsValue(draftOp)) {
      onUpdate([draftValue.trim()], draftOp);
    } else {
      onUpdate([], draftOp);
    }
    setOpen(false);
  };

  const incomplete = !isTextFilterComplete(filter);
  const committedOp = (filter.op ?? "is") as TextFilterOperator;
  const committedValue = filter.v?.[0]?.trim();

  return (
    <Group>
      <GroupText
        className={cn(
          buttonVariants({
            size: "xs",
            variant: "outline",
          }),
          "pointer-events-none",
        )}
      >
        {category.label}
      </GroupText>
      <GroupSeparator />
      <Popover onOpenChange={handleOpenChange} open={open}>
        <PopoverTrigger
          render={
            <Button
              className={cn(
                "min-w-0 gap-2",
                incomplete ? "justify-between" : "justify-start",
              )}
              size="xs"
              variant="outline"
            />
          }
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <Badge size="sm" variant="secondary">
              {textFilterOperatorLabel(committedOp)}
            </Badge>
            {textOperatorNeedsValue(committedOp) ? (
              committedValue ? (
                <span className="min-w-0 truncate">{committedValue}</span>
              ) : (
                <span
                  aria-label="Select value"
                  className="text-muted-foreground"
                >
                  …
                </span>
              )
            ) : null}
          </span>
          {incomplete && <ChevronsUpDownIcon className="-me-1!" />}
        </PopoverTrigger>
        <PopoverPopup
          align="start"
          portalProps={{
            className: "*:data-[slot=popover-positioner]:transition-none",
          }}
        >
          <div className="flex flex-col gap-2">
            <Select
              aria-label="match type"
              items={textFilterSelectItems}
              onValueChange={(next: TextFilterOperator | null): void => {
                if (next) {
                  setDraftOp(next);
                }
              }}
              value={draftOp}
            >
              <SelectTrigger
                className="rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
                size="sm"
              >
                <SelectValue placeholder="match type" />
              </SelectTrigger>
              <SelectPopup>
                {TEXT_FILTER_OPERATORS.map(({ label: opLabel, value }) => (
                  <SelectItem key={value} value={value}>
                    {opLabel}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
            {textOperatorNeedsValue(draftOp) ? (
              <Input
                className="rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
                size="sm"
                aria-label={`${category.label} value`}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setDraftValue(e.target.value)
                }
                placeholder={`Enter ${category.label.toLowerCase()}`}
                type="text"
                value={draftValue}
              />
            ) : null}
            <Button
              disabled={applyDisabled}
              onClick={handleApply}
              size="sm"
              variant="outline"
              type="button"
            >
              Apply
            </Button>
          </div>
        </PopoverPopup>
      </Popover>
      <GroupSeparator />
      <Button
        aria-label="Remove filter"
        onClick={onRemove}
        size="icon-xs"
        variant="outline"
      >
        <XIcon />
      </Button>
    </Group>
  );
}

function BookingsFilters(): React.ReactElement {
  const { activeFilters, addFilter, updateFilter, removeFilter, clearAll } =
    useActiveFilters();
  const [newlyAddedFilter, setNewlyAddedFilter] = useState<string | null>(null);

  const handleSelectFilter = (categoryId: string): void => {
    const category = filterCategories.find((c) => c.id === categoryId);
    addFilter(categoryId, category?.kind === "text" ? { op: "is" } : undefined);
    setNewlyAddedFilter(categoryId);
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
      {/* Search + Filter menu */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <InputGroup className="sm:max-w-[200px]">
            <InputGroupAddon>
              <SearchIcon aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              size="sm"
              aria-label="Search"
              placeholder="Search"
              type="search"
            />
          </InputGroup>
        </div>
        <div className="flex items-center justify-between gap-2">
          <FilterMenu
            activeFilterIds={activeFilterIds}
            hasFilters={hasFilters}
            onSelectFilter={handleSelectFilter}
          />
          <SavedFiltersCombobox />
        </div>
      </div>
      {hasFilters && (
        <div className="rounded-xl bg-muted">
          <div className="flex flex-wrap items-start justify-between gap-2 overflow-x-auto p-2">
            {/* Active filters */}
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((filter) => {
                const category = filterCategories.find(
                  (c) => c.id === filter.f,
                );
                if (!category) return null;
                if (category.kind === "text") {
                  return (
                    <TextFilterActiveFilter
                      autoOpen={newlyAddedFilter === filter.f}
                      category={category}
                      filter={filter}
                      key={filter.f}
                      onRemove={(): void => handleRemoveFilter(filter.f)}
                      onUpdate={(
                        values: string[],
                        op: TextFilterOperator,
                      ): void => handleUpdateFilter(filter.f, values, op)}
                    />
                  );
                }
                if (category.id === "dateRange") {
                  return (
                    <DateRangeActiveFilter
                      autoOpen={newlyAddedFilter === filter.f}
                      category={category}
                      filter={filter}
                      key={filter.f}
                      onRemove={(): void => handleRemoveFilter(filter.f)}
                      onUpdate={(values: string[]): void =>
                        handleUpdateFilter(filter.f, values)
                      }
                    />
                  );
                }
                return (
                  <ActiveFilterComponent
                    autoOpen={newlyAddedFilter === filter.f}
                    category={category}
                    filter={filter}
                    key={filter.f}
                    onRemove={(): void => handleRemoveFilter(filter.f)}
                    onUpdate={(values: string[]): void =>
                      handleUpdateFilter(filter.f, values)
                    }
                  />
                );
              })}
              {activeFilters.every((f) => {
                const cat = filterCategories.find((c) => c.id === f.f);
                if (cat?.kind === "text") {
                  return isTextFilterComplete(f);
                }
                return Boolean(f.v && f.v.length > 0);
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
                          .map((category) => (
                            <MenuItem
                              key={category.id}
                              onClick={(): void =>
                                handleSelectFilter(category.id)
                              }
                            >
                              {category.label}
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

export type { TextFilterOperator, FilterOption, FilterCategory, ActiveFilter };
export { BookingsFilters, filterCategories };
