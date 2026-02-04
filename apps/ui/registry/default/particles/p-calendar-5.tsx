"use client";
import * as React from "react";
import type { DropdownProps } from "react-day-picker";

import { Calendar } from "@/registry/default/ui/calendar";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/registry/default/ui/select";

function CalendarDropdown(props: DropdownProps) {
  const { options, value, onChange, "aria-label": ariaLabel } = props;

  const handleValueChange = (newValue: string | null) => {
    if (onChange && newValue) {
      const syntheticEvent = {
        target: { value: newValue },
      } as React.ChangeEvent<HTMLSelectElement>;
      onChange(syntheticEvent);
    }
  };

  return (
    <Select onValueChange={handleValueChange} value={value?.toString()}>
      <SelectTrigger aria-label={ariaLabel} className="min-w-none">
        <SelectValue />
      </SelectTrigger>
      <SelectPopup>
        {options?.map((option) => (
          <SelectItem
            disabled={option.disabled}
            key={option.value}
            value={option.value.toString()}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}

export default function Particle() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  return (
    <Calendar
      captionLayout="dropdown"
      components={{ Dropdown: CalendarDropdown }}
      endMonth={new Date(2030, 11)}
      mode="single"
      onSelect={setDate}
      selected={date}
      startMonth={new Date(2020, 0)}
    />
  );
}
