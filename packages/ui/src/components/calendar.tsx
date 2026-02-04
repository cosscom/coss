"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import * as React from "react";
import {
  type DayButtonProps,
  DayPicker,
  getDefaultClassNames,
  type Locale,
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
  locale,
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: ButtonVariant;
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      captionLayout={captionLayout}
      className={cn(
        "w-fit",
        "rtl:**:[.rdp-button_next>svg]:rotate-180",
        "rtl:**:[.rdp-button_previous>svg]:rotate-180",
        className,
      )}
      classNames={{
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) p-0 text-muted-foreground/80 hover:text-foreground aria-disabled:opacity-50",
          defaultClassNames.button_next,
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) p-0 text-muted-foreground/80 hover:text-foreground aria-disabled:opacity-50",
          defaultClassNames.button_previous,
        ),
        caption_label: cn(
          "select-none font-medium",
          captionLayout === "label"
            ? "text-sm"
            : "flex items-center gap-1 rounded-(--cell-radius) text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground",
          defaultClassNames.caption_label,
        ),
        day: cn(
          "group relative h-full w-full select-none rounded-(--cell-radius) p-0 text-center aspect-square",
          props.showWeekNumber
            ? "[&:nth-child(2)[data-selected=true]_button]:rounded-l-(--cell-radius)"
            : "[&:first-child[data-selected=true]_button]:rounded-l-(--cell-radius)",
          "[&:last-child[data-selected=true]_button]:rounded-r-(--cell-radius)",
          defaultClassNames.day,
        ),
        day_button: cn(
          "relative flex size-(--cell-size) items-center justify-center whitespace-nowrap rounded-(--cell-radius) p-0 text-foreground outline-none",
          "group-[[data-selected]:not(.range-middle)]:[transition-property:color,background-color,border-radius,box-shadow] group-[[data-selected]:not(.range-middle)]:duration-150",
          "group-data-disabled:pointer-events-none group-data-disabled:text-foreground/30 group-data-disabled:line-through",
          "focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          "hover:not-in-data-selected:bg-accent hover:not-in-data-selected:text-foreground",
          "group-data-selected:bg-primary group-data-selected:text-primary-foreground",
          "group-data-outside:text-foreground/30 group-data-selected:group-data-outside:text-primary-foreground",
          "group-[.range-start:not(.range-end)]:rounded-e-none group-[.range-end:not(.range-start)]:rounded-s-none",
          "group-[.range-middle]:rounded-none group-[.range-middle]:group-data-selected:bg-accent group-[.range-middle]:group-data-selected:text-foreground",
          defaultClassNames.day_button,
        ),
        disabled: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled,
        ),
        dropdown: cn(
          "absolute inset-0 bg-popover opacity-0",
          defaultClassNames.dropdown,
        ),
        dropdown_root: cn(
          "relative rounded-(--cell-radius)",
          defaultClassNames.dropdown_root,
        ),
        dropdowns: cn(
          "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns,
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        month_caption: cn(
          "relative z-20 mx-10 mb-1 flex h-(--cell-size) items-center justify-center",
          defaultClassNames.month_caption,
        ),
        months: cn(
          "relative flex flex-col gap-4 sm:flex-row",
          defaultClassNames.months,
        ),
        nav: cn(
          "absolute inset-x-0 top-0 z-10 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav,
        ),
        outside: cn(
          "text-muted-foreground aria-selected:text-muted-foreground",
          defaultClassNames.outside,
        ),
        range_end: cn("range-end", defaultClassNames.range_end),
        range_middle: cn("range-middle", defaultClassNames.range_middle),
        range_start: cn("range-start", defaultClassNames.range_start),
        root: cn("w-fit", defaultClassNames.root),
        table: "w-full border-collapse",
        today: cn(
          "*:after:pointer-events-none *:after:absolute *:after:bottom-1 *:after:start-1/2 *:after:z-10 *:after:size-[3px] *:after:-translate-x-1/2 *:after:rounded-full *:after:bg-primary *:after:transition-colors",
          "[&[data-selected]:not(.range-middle)>*]:after:bg-background [&[data-disabled]>*]:after:bg-foreground/30",
          defaultClassNames.today,
        ),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        week_number: cn(
          "select-none text-[0.8rem] text-muted-foreground",
          defaultClassNames.week_number,
        ),
        week_number_header: cn(
          "w-(--cell-size) select-none",
          defaultClassNames.week_number_header,
        ),
        weekday: cn(
          "flex-1 select-none rounded-(--cell-radius) p-0 text-[0.8rem] font-normal text-muted-foreground",
          defaultClassNames.weekday,
        ),
        weekdays: cn("flex", defaultClassNames.weekdays),
        ...classNames,
      }}
      components={{
        Chevron: ({
          className: chevronClassName,
          orientation,
          ...chevronProps
        }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon
                aria-hidden="true"
                className={chevronClassName}
                size={16}
                {...chevronProps}
              />
            );
          }
          if (orientation === "right") {
            return (
              <ChevronRightIcon
                aria-hidden="true"
                className={chevronClassName}
                size={16}
                {...chevronProps}
              />
            );
          }
          return (
            <ChevronRightIcon
              aria-hidden="true"
              className={chevronClassName}
              size={16}
              {...chevronProps}
            />
          );
        },
        DayButton: (dayButtonProps) => (
          <CalendarDayButton {...dayButtonProps} locale={locale} />
        ),
        Root: ({ className: rootClassName, rootRef, ...rootProps }) => {
          return (
            <div
              className={cn(
                "[--cell-radius:calc(var(--radius)-2px)] [--cell-size:calc(var(--spacing)*9)]",
                rootClassName,
              )}
              data-slot="calendar"
              ref={rootRef}
              {...rootProps}
            />
          );
        },
        WeekNumber: ({ children, ...weekNumberProps }) => {
          return (
            <span {...weekNumberProps}>
              <span className="flex size-(--cell-size) items-center justify-center">
                {children}
              </span>
            </span>
          );
        },
        ...components,
      }}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(locale?.code, { month: "short" }),
        ...formatters,
      }}
      locale={locale}
      showOutsideDays={showOutsideDays}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  ...props
}: DayButtonProps & { locale?: Partial<Locale> }) {
  const defaultClassNames = getDefaultClassNames();

  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <button
      className={cn(
        "relative z-10 flex size-(--cell-size) cursor-pointer items-center justify-center rounded-(--cell-radius) p-0 font-normal text-sm outline-none transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        "data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground data-[selected=true]:hover:bg-primary data-[selected=true]:hover:text-primary-foreground",
        "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
        defaultClassNames.day_button,
        className,
      )}
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-disabled={modifiers.disabled}
      data-focused={modifiers.focused}
      data-outside={modifiers.outside}
      data-selected={modifiers.selected}
      data-today={modifiers.today}
      ref={ref}
      tabIndex={modifiers.focused ? 0 : -1}
      type="button"
      {...props}
    >
      {day.date.toLocaleDateString(locale?.code, { day: "numeric" })}
    </button>
  );
}

export { Calendar, CalendarDayButton };
