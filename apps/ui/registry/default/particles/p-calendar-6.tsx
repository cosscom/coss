"use client";
import { ChevronsUpDownIcon } from "lucide-react";
import * as React from "react";
import type { DropdownProps } from "react-day-picker";

import { Button } from "@/registry/default/ui/button";
import { Calendar } from "@/registry/default/ui/calendar";
import {
  Combobox,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxTrigger,
  ComboboxValue,
} from "@/registry/default/ui/combobox";

interface DropdownItem {
  disabled?: boolean;
  label: string;
  value: string;
}

function CalendarDropdown(props: DropdownProps) {
  const { options, value, onChange, "aria-label": ariaLabel } = props;

  const items: DropdownItem[] =
    options?.map((option) => ({
      disabled: option.disabled,
      label: option.label,
      value: option.value.toString(),
    })) ?? [];

  const selectedItem = items.find((item) => item.value === value?.toString());

  const handleValueChange = (newValue: DropdownItem | null) => {
    if (onChange && newValue) {
      const syntheticEvent = {
        target: { value: newValue.value },
      } as React.ChangeEvent<HTMLSelectElement>;
      onChange(syntheticEvent);
    }
  };

  return (
    <Combobox
      aria-label={ariaLabel}
      items={items}
      onValueChange={handleValueChange}
      value={selectedItem}
    >
      <ComboboxTrigger
        render={
          <Button
            className="min-w-none justify-between font-normal"
            variant="outline"
          />
        }
      >
        <ComboboxValue />
        <ChevronsUpDownIcon className="-me-1! size-3.5" />
      </ComboboxTrigger>
      <ComboboxPopup aria-label={ariaLabel}>
        <ComboboxList>
          {(item: DropdownItem) => (
            <ComboboxItem
              disabled={item.disabled}
              key={item.value}
              value={item}
            >
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxPopup>
    </Combobox>
  );
}

export default function Particle() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  return (
    <Calendar
      captionLayout="dropdown"
      components={{ Dropdown: CalendarDropdown }}
      endMonth={new Date(2030, 11)}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
      }}
      mode="single"
      onSelect={setDate}
      selected={date}
      startMonth={new Date(2020, 0)}
    />
  );
}
