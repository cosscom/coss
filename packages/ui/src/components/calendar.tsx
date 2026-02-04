"use client";

import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import * as React from "react";
import {
  type DayButtonProps,
  DayPicker,
  getDefaultClassNames,
} from "react-day-picker";

import { cn } from "@coss/ui/lib/utils";
import { buttonVariants } from "@coss/ui/components/button";

type ButtonVariant =
  | "default"
  | "destructive"
  | "destructive-outline"
  | "ghost"
  | "link"
  | "outline"
  | "secondary";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components: userComponents,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: ButtonVariant;
}) {
  const rdpDefaultClassNames = getDefaultClassNames();

  const defaultClassNames = {
    button_next: cn(
      buttonVariants({ variant: buttonVariant }),
      "size-(--cell-size) p-0 aria-disabled:opacity-50 select-none",
      rdpDefaultClassNames.button_next,
    ),
    button_previous: cn(
      buttonVariants({ variant: buttonVariant }),
      "size-(--cell-size) p-0 aria-disabled:opacity-50 select-none",
      rdpDefaultClassNames.button_previous,
    ),
    caption_label: cn(
      "select-none font-medium",
      captionLayout === "label"
        ? "text-sm"
        : "flex h-8 items-center gap-1 rounded-md pl-2 pr-1 text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground",
      rdpDefaultClassNames.caption_label,
    ),
    day: cn(
      "group/day relative aspect-square h-full w-full select-none p-0 text-center [&:last-child[data-selected=true]_button]:rounded-r-lg",
      props.showWeekNumber
        ? "[&:nth-child(2)[data-selected=true]_button]:rounded-l-lg"
        : "[&:first-child[data-selected=true]_button]:rounded-l-lg",
      rdpDefaultClassNames.day,
    ),
    disabled: cn(
      "text-muted-foreground opacity-50",
      rdpDefaultClassNames.disabled,
    ),
    dropdown: cn(
      "absolute inset-0 bg-popover opacity-0",
      rdpDefaultClassNames.dropdown,
    ),
    dropdown_root: cn(
      "relative rounded-md border border-input shadow-xs has-focus:border-ring has-focus:ring-[3px] has-focus:ring-ring/50",
      rdpDefaultClassNames.dropdown_root,
    ),
    dropdowns: cn(
      "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium",
      rdpDefaultClassNames.dropdowns,
    ),
    hidden: cn("invisible", rdpDefaultClassNames.hidden),
    month: cn("flex w-full flex-col gap-4", rdpDefaultClassNames.month),
    month_caption: cn(
      "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
      rdpDefaultClassNames.month_caption,
    ),
    months: cn(
      "relative flex flex-col gap-4 md:flex-row",
      rdpDefaultClassNames.months,
    ),
    nav: cn(
      "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
      rdpDefaultClassNames.nav,
    ),
    outside: cn(
      "text-muted-foreground aria-selected:text-muted-foreground",
      rdpDefaultClassNames.outside,
    ),
    range_end: cn("rounded-r-lg bg-accent", rdpDefaultClassNames.range_end),
    range_middle: cn("rounded-none", rdpDefaultClassNames.range_middle),
    range_start: cn("rounded-l-lg bg-accent", rdpDefaultClassNames.range_start),
    table: "w-full border-collapse",
    today: cn(
      "rounded-lg bg-accent text-accent-foreground data-[selected=true]:rounded-none",
      rdpDefaultClassNames.today,
    ),
    week: cn("mt-2 flex w-full", rdpDefaultClassNames.week),
    week_number: cn(
      "select-none text-[0.8rem] text-muted-foreground",
      rdpDefaultClassNames.week_number,
    ),
    week_number_header: cn(
      "w-(--cell-size) select-none",
      rdpDefaultClassNames.week_number_header,
    ),
    weekday: cn(
      "flex-1 select-none rounded-lg p-0 text-[0.8rem] font-normal text-muted-foreground",
      rdpDefaultClassNames.weekday,
    ),
    weekdays: cn("flex", rdpDefaultClassNames.weekdays),
  };

  const mergedClassNames = Object.keys(defaultClassNames).reduce(
    (acc, key) => {
      const userClass = classNames?.[key as keyof typeof classNames];
      const baseClass =
        defaultClassNames[key as keyof typeof defaultClassNames];

      acc[key as keyof typeof defaultClassNames] = userClass
        ? cn(baseClass, userClass)
        : baseClass;

      return acc;
    },
    { ...defaultClassNames } as typeof defaultClassNames,
  );

  const defaultComponents = {
    Chevron: ({
      className: chevronClassName,
      orientation,
      ...chevronProps
    }: {
      className?: string;
      size?: number;
      disabled?: boolean;
      orientation?: "left" | "right" | "up" | "down";
    }) => {
      if (orientation === "left") {
        return (
          <ChevronLeftIcon
            className={cn("size-4", chevronClassName)}
            {...chevronProps}
          />
        );
      }
      if (orientation === "right") {
        return (
          <ChevronRightIcon
            className={cn("size-4", chevronClassName)}
            {...chevronProps}
          />
        );
      }
      return (
        <ChevronDownIcon
          className={cn("size-4", chevronClassName)}
          {...chevronProps}
        />
      );
    },
    DayButton: CalendarDayButton,
    WeekNumber: ({
      children,
      ...weekNumberProps
    }: {
      children?: React.ReactNode;
    } & React.HTMLAttributes<HTMLTableCellElement>) => {
      return (
        <td {...weekNumberProps}>
          <div className="flex size-(--cell-size) items-center justify-center text-center">
            {children}
          </div>
        </td>
      );
    },
  };

  const mergedComponents = {
    ...defaultComponents,
    ...userComponents,
  };

  return (
    <DayPicker
      captionLayout={captionLayout}
      className={cn(
        "group/calendar w-fit bg-background p-3 [--cell-size:--spacing(9)] sm:[--cell-size:--spacing(8)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      classNames={mergedClassNames}
      components={mergedComponents}
      data-slot="calendar"
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      mode="single"
      showOutsideDays={showOutsideDays}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: DayButtonProps) {
  const rdpDefaultClassNames = getDefaultClassNames();

  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <button
      className={cn(
        buttonVariants({ variant: "ghost" }),
        "flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 p-0 font-normal leading-none",
        "group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50",
        "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground",
        "data-[range-start=true]:rounded-r-none data-[range-start=true]:rounded-l-lg data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground",
        "data-[range-end=true]:rounded-r-lg data-[range-end=true]:rounded-l-none data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground",
        "data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground",
        "dark:hover:text-accent-foreground [&>span]:text-xs [&>span]:opacity-70",
        rdpDefaultClassNames.day,
        className,
      )}
      data-day={day.date.toLocaleDateString()}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      data-range-start={modifiers.range_start}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      ref={ref}
      type="button"
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
