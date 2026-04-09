"use client";

import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { Input } from "@coss/ui/components/input";
import {
  Popover,
  PopoverPopup,
  PopoverTrigger,
} from "@coss/ui/components/popover";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@coss/ui/components/select";
import { cn } from "@coss/ui/lib/utils";
import { ChevronsUpDownIcon } from "lucide-react";
import type * as React from "react";
import { useEffect, useRef, useState } from "react";
import { FilterChipShell } from "./filter-chip-shell";
import {
  type ActiveFilter,
  type FilterField,
  isTextFilterComplete,
  type TextFilterOperator,
} from "./filter-chip-types";

const TEXT_FILTER_OPERATORS: {
  label: string;
  value: TextFilterOperator;
}[] = [
  { label: "is", value: "is" },
  { label: "is not", value: "is-not" },
  { label: "contains", value: "contains" },
  { label: "does not contain", value: "does-not-contain" },
  { label: "starts with", value: "starts-with" },
  { label: "ends with", value: "ends-with" },
  { label: "is empty", value: "is-empty" },
  { label: "not empty", value: "not-empty" },
];

const textFilterSelectItems: {
  label: string;
  value: TextFilterOperator;
}[] = TEXT_FILTER_OPERATORS.map(({ label, value }) => ({
  label,
  value,
}));

function textOperatorNeedsValue(op: TextFilterOperator): boolean {
  return op !== "is-empty" && op !== "not-empty";
}

function textFilterOperatorLabel(op: TextFilterOperator): string {
  return TEXT_FILTER_OPERATORS.find((o) => o.value === op)?.label ?? "is";
}

export function TextFilterChip({
  autoOpen = false,
  field,
  filter,
  onRemove,
  onUpdate,
}: {
  autoOpen?: boolean;
  field: Extract<FilterField, { kind: "text" }>;
  filter: ActiveFilter;
  onRemove: () => void;
  onUpdate: (values: string[], op: TextFilterOperator) => void;
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
    <FilterChipShell label={field.label} onRemove={onRemove}>
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
          className="min-w-64 transition-none"
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
                aria-label={`${field.label} value`}
                className="rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setDraftValue(e.target.value)
                }
                placeholder={`Enter ${field.label.toLowerCase()}`}
                size="sm"
                type="text"
                value={draftValue}
              />
            ) : null}
            <Button
              className="rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
              disabled={applyDisabled}
              onClick={handleApply}
              size="sm"
              type="button"
              variant="outline"
            >
              Apply
            </Button>
          </div>
        </PopoverPopup>
      </Popover>
    </FilterChipShell>
  );
}
