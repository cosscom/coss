"use client";

import { Checkbox } from "@coss/ui/components/checkbox";
import { CheckboxGroup } from "@coss/ui/components/checkbox-group";
import { FieldItem, FieldLabel } from "@coss/ui/components/field";
import Image from "next/image";

export interface ImageCheckboxOptionItem {
  label: string;
  value: string;
  imageSrc: string;
}

export interface ImageCheckboxOptionProps {
  items: ImageCheckboxOptionItem[];
  defaultValue?: string[];
  /** Controlled mode: which items are checked. */
  value?: string[];
  /** Called when checked items change. */
  onValueChange?: (value: string[]) => void;
  /** Value of the item that is the default. Shows "Default" after its label when set. */
  defaultItem?: string;
}

export function ImageCheckboxOption({
  items,
  defaultValue,
  value,
  onValueChange,
  defaultItem,
}: ImageCheckboxOptionProps) {
  const isControlled = value != null && onValueChange != null;

  return (
    <CheckboxGroup
      className="flex w-full flex-row gap-4 md:gap-6"
      defaultValue={
        !isControlled ? (defaultValue ?? items.map((i) => i.value)) : undefined
      }
      onValueChange={onValueChange}
      value={isControlled ? value : undefined}
    >
      {items.map((item) => (
        <FieldItem className="flex-1" key={item.value}>
          <FieldLabel className="grid w-full cursor-pointer grid-cols-[auto_1fr] grid-rows-[auto_auto] gap-x-2 gap-y-3 max-sm:grid-cols-1">
            <Checkbox
              className="peer col-start-1 row-start-2 shrink-0 max-sm:hidden"
              value={item.value}
            />
            <span className="relative col-span-2 row-start-1 block aspect-208/120 w-full min-w-0 overflow-hidden rounded-lg not-peer-data-checked:opacity-80 shadow-xs transition-[box-shadow,opacity] peer-data-disabled:cursor-not-allowed peer-data-disabled:opacity-64 peer-data-checked:ring-2 peer-data-checked:ring-primary peer-data-checked:ring-offset-1 peer-data-checked:ring-offset-background max-sm:col-span-1">
              <Image
                alt={item.label}
                className="h-full w-full object-cover object-center shadow-xs"
                fill
                sizes="(min-width: 0) 100vw"
                src={item.imageSrc}
              />
            </span>
            <span className="col-start-2 row-start-2 flex items-center gap-1 self-center not-peer-data-checked:text-muted-foreground/72 max-sm:col-start-1 max-sm:justify-self-center max-sm:text-center">
              {item.label}
              {defaultItem === item.value && (
                <span className="font-normal text-muted-foreground">
                  (default)
                </span>
              )}
            </span>
          </FieldLabel>
        </FieldItem>
      ))}
    </CheckboxGroup>
  );
}
