"use client";

import { Button } from "@coss/ui/components/button";
import { Calendar } from "@coss/ui/components/calendar";
import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxTrigger,
  ComboboxValue,
} from "@coss/ui/components/combobox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@coss/ui/components/empty";
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import { FieldsetLegend } from "@coss/ui/components/fieldset";
import { Group } from "@coss/ui/components/group";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
} from "@coss/ui/components/input-group";
import {
  NumberField,
  NumberFieldInput,
} from "@coss/ui/components/number-field";
import {
  Popover,
  PopoverPopup,
  PopoverTrigger,
} from "@coss/ui/components/popover";
import { SelectButton } from "@coss/ui/components/select";
import { ExternalLinkIcon, FileTextIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

const monthOptions = [
  { label: "January 2026", value: "January 2026" },
  { label: "February 2026", value: "February 2026" },
  { label: "March 2026", value: "March 2026" },
  { label: "April 2026", value: "April 2026" },
  { label: "May 2026", value: "May 2026" },
  { label: "June 2026", value: "June 2026" },
];

export function BillingPageContent() {
  const today = new Date();
  const subDays = (date: Date, days: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() - days);
    return next;
  };
  const startOfMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), 1);
  const startOfYear = (date: Date) => new Date(date.getFullYear(), 0, 1);
  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);

  const [credits, setCredits] = useState<number | null>(50);
  const [expenseLogMonth, setExpenseLogMonth] = useState("February 2026");
  const [invoiceRange, setInvoiceRange] = useState<DateRange | undefined>({
    from: subDays(today, 6),
    to: today,
  });
  const [invoiceMonth, setInvoiceMonth] = useState(today);
  const [selectedInvoicePreset, setSelectedInvoicePreset] = useState<
    string | null
  >("last-7-days");

  const applyInvoicePreset = (
    presetValue: string,
    range: { from: Date; to: Date },
  ) => {
    setInvoiceRange(range);
    setSelectedInvoicePreset(presetValue);
    setInvoiceMonth(range.to);
  };

  const invoicePresets = [
    {
      label: "Today",
      onClick: () => {
        applyInvoicePreset("today", { from: today, to: today });
      },
      value: "today",
    },
    {
      label: "Last 7 days",
      onClick: () => {
        applyInvoicePreset("last-7-days", {
          from: subDays(today, 6),
          to: today,
        });
      },
      value: "last-7-days",
    },
    {
      label: "Last 30 days",
      onClick: () => {
        applyInvoicePreset("last-30-days", {
          from: subDays(today, 29),
          to: today,
        });
      },
      value: "last-30-days",
    },
    {
      label: "Month to date",
      onClick: () => {
        applyInvoicePreset("month-to-date", {
          from: startOfMonth(today),
          to: today,
        });
      },
      value: "month-to-date",
    },
    {
      label: "Year to date",
      onClick: () => {
        applyInvoicePreset("year-to-date", {
          from: startOfYear(today),
          to: today,
        });
      },
      value: "year-to-date",
    },
  ];

  const invoiceRangeLabel =
    invoiceRange?.from && invoiceRange?.to
      ? `${formatDate(invoiceRange.from)} - ${formatDate(invoiceRange.to)}`
      : "Select date range";

  return (
    <div className="flex flex-col gap-4">
      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>Billing</CardFrameTitle>
          <CardFrameDescription>Manage all things billing</CardFrameDescription>
        </CardFrameHeader>
        <Card className="rounded-b-none!">
          <CardPanel>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardFrameTitle>Manage billing</CardFrameTitle>
                <CardFrameDescription>
                  View and manage your billing details
                </CardFrameDescription>
              </div>
              <Button>
                Billing portal
                <ExternalLinkIcon aria-hidden="true" />
              </Button>
            </div>
          </CardPanel>
        </Card>
      </CardFrame>

      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>Credits</CardFrameTitle>
          <CardFrameDescription>
            View and manage credits for sending SMS messages
          </CardFrameDescription>
        </CardFrameHeader>
        <Card className="rounded-b-none!">
          <CardPanel>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <FieldsetLegend className="inline" render={<div />}>
                  Current balance:{" "}
                  <span className="font-normal text-muted-foreground">0</span>
                </FieldsetLegend>
              </div>
              <Field className="md:col-start-1">
                <div className="flex items-center gap-2">
                  <FieldLabel>Additional credits</FieldLabel>
                </div>
                <Group aria-label="Additional credits" className="w-full gap-2">
                  <InputGroup>
                    <NumberField
                      aria-label="Credits"
                      min={1}
                      onValueChange={(value) => setCredits(value ?? 0)}
                      value={credits}
                    >
                      <NumberFieldInput className="text-left" />
                    </NumberField>
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>Credits</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  <div>
                    <Button variant="outline">Buy</Button>
                  </div>
                </Group>
                <FieldDescription>
                  One credit is worth 1¢ (USD).
                </FieldDescription>
              </Field>
              <Field className="md:col-start-1">
                <FieldLabel>Download Expense Log</FieldLabel>
                <Group
                  aria-label="Download Expense Log"
                  className="w-full gap-2"
                >
                  <Combobox
                    autoHighlight
                    items={monthOptions}
                    onValueChange={(item) =>
                      item && setExpenseLogMonth(item.value)
                    }
                    value={
                      monthOptions.find((m) => m.value === expenseLogMonth) ??
                      null
                    }
                  >
                    <ComboboxTrigger render={<SelectButton />}>
                      <ComboboxValue />
                    </ComboboxTrigger>
                    <ComboboxPopup aria-label="Select month">
                      <div className="border-b p-2">
                        <ComboboxInput
                          placeholder="e.g. February 2026"
                          showTrigger={false}
                          startAddon={<SearchIcon />}
                        />
                      </div>
                      <ComboboxEmpty>No months found.</ComboboxEmpty>
                      <ComboboxList>
                        {(item: (typeof monthOptions)[0]) => (
                          <ComboboxItem key={item.value} value={item}>
                            {item.label}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxPopup>
                  </Combobox>
                  <div>
                    <Button variant="outline">Download</Button>
                  </div>
                </Group>
              </Field>
            </div>
          </CardPanel>
        </Card>
      </CardFrame>

      <CardFrame>
        <CardFrameHeader>
          <div className="flex w-full items-center justify-between gap-4">
            <CardFrameTitle>Invoices</CardFrameTitle>
            <Popover>
              <PopoverTrigger render={<SelectButton className="w-fit" />}>
                {invoiceRangeLabel}
              </PopoverTrigger>
              <PopoverPopup align="end" className="p-0!">
                <div className="flex max-sm:flex-col">
                  <div className="relative max-sm:order-1 max-sm:border-t max-sm:pt-2 sm:py-1">
                    <div className="flex h-full flex-col gap-0.5 sm:min-w-36 sm:border-e sm:pe-2">
                      {invoicePresets.map((preset) => (
                        <Button
                          className="justify-start"
                          data-pressed={
                            selectedInvoicePreset === preset.value
                              ? ""
                              : undefined
                          }
                          key={preset.label}
                          onClick={preset.onClick}
                          variant="ghost"
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Calendar
                    className="max-sm:pb-2 sm:ps-2"
                    mode="range"
                    month={invoiceMonth}
                    numberOfMonths={1}
                    onMonthChange={setInvoiceMonth}
                    onSelect={(range) => {
                      setInvoiceRange(range);
                      setSelectedInvoicePreset(null);
                    }}
                    selected={invoiceRange}
                  />
                </div>
              </PopoverPopup>
            </Popover>
          </div>
        </CardFrameHeader>
        <Card className="rounded-b-none!">
          <CardPanel>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileTextIcon />
                </EmptyMedia>
                <EmptyTitle>No invoices found</EmptyTitle>
                <EmptyDescription>
                  No invoices found in the selected date range.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardPanel>
        </Card>
      </CardFrame>

      <div className="mt-2 text-center text-muted-foreground/72 text-sm">
        Need help?{" "}
        <Link
          className="text-muted-foreground underline hover:text-foreground"
          href="#"
        >
          Contact support
        </Link>
      </div>
    </div>
  );
}
