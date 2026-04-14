"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@coss/ui/components/avatar";
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
import { cn } from "@coss/ui/lib/utils";
import { ChevronsUpDownIcon, SearchIcon } from "lucide-react";
import type * as React from "react";
import { useEffect, useRef, useState } from "react";
import { FilterChipShell } from "./filter-chip-shell";
import type {
  ActiveFilter,
  FilterField,
  FilterOption,
} from "./filter-chip-types";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0]?.charAt(0).toUpperCase() ?? "";
  }
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts[parts.length - 1]?.charAt(0) ?? "";
  return (first + last).toUpperCase();
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

function OptionAvatar({
  avatarUrl,
  className,
  name,
}: {
  avatarUrl?: string | null;
  className?: string;
  name: string;
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

export function OptionsFilterChip({
  autoOpen = false,
  field,
  filter,
  onRemove,
  onUpdate,
}: {
  autoOpen?: boolean;
  field: Extract<FilterField, { kind: "options" }>;
  filter: ActiveFilter;
  onRemove: () => void;
  onUpdate: (values: string[]) => void;
}): React.ReactElement {
  const [open, setOpen] = useState(autoOpen);
  const hasAutoOpened = useRef(false);
  const [sortedItems, setSortedItems] = useState<FilterOption[]>(field.options);
  const showAvatar = field.showAvatar === true;

  useEffect(() => {
    if (autoOpen && !hasAutoOpened.current) {
      setOpen(true);
      hasAutoOpened.current = true;
    }
  }, [autoOpen]);

  const selectedValues = filter.v ?? [];
  const selectedOptions = selectedValues
    .map((id) => field.options.find((opt) => opt.id === id))
    .filter((opt): opt is FilterOption => opt !== undefined);

  const renderTriggerContent = (): string | React.ReactElement => {
    if (selectedOptions.length === 0) return "Select";
    const firstOption = selectedOptions[0];
    const remainingCount = selectedOptions.length - 1;

    if (showAvatar) {
      return (
        <SelectionDisplay
          label={firstOption?.label ?? ""}
          remainingCount={remainingCount}
        >
          <OptionAvatar
            avatarUrl={firstOption?.avatar}
            name={firstOption?.label ?? ""}
          />
        </SelectionDisplay>
      );
    }

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
      const selected = field.options.filter((opt) =>
        selectedValues.includes(opt.id),
      );
      const unselected = field.options.filter(
        (opt) => !selectedValues.includes(opt.id),
      );
      setSortedItems([...selected, ...unselected]);
    }
    if (!isOpen && selectedValues.length === 0) {
      onRemove();
    }
  };

  return (
    <FilterChipShell label={field.label} onRemove={onRemove}>
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
        <ComboboxPopup aria-label={`Select ${field.label}`}>
          <div className="border-b p-2">
            <ComboboxInput
              className="rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
              placeholder={`Search ${field.label.toLowerCase()}`}
              showTrigger={false}
              size="sm"
              startAddon={<SearchIcon />}
            />
          </div>
          <ComboboxEmpty>No items found.</ComboboxEmpty>
          <ComboboxList>
            {(option: FilterOption): React.ReactElement => (
              <ComboboxItem key={option.id} value={option}>
                {showAvatar ? (
                  <div className="flex items-center gap-2">
                    <OptionAvatar
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
    </FilterChipShell>
  );
}
