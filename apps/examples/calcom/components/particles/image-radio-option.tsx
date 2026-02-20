"use client";

import { FieldItem, FieldLabel } from "@coss/ui/components/field";
import { Radio, RadioGroup } from "@coss/ui/components/radio-group";
import Image from "next/image";

export interface ImageRadioOptionItem {
  label: string;
  value: string;
  imageSrc: string;
}

export interface ImageRadioOptionProps {
  items: ImageRadioOptionItem[];
  defaultValue?: string;
}

export function ImageRadioOption({
  items,
  defaultValue,
}: ImageRadioOptionProps) {
  return (
    <RadioGroup
      className="flex w-full flex-row gap-4 md:gap-6"
      defaultValue={defaultValue}
    >
      {items.map((item) => (
        <FieldItem className="flex-1" key={item.value}>
          <FieldLabel className="grid w-full cursor-pointer grid-cols-[auto_1fr] grid-rows-[auto_auto] gap-x-2 gap-y-3 max-sm:grid-cols-1">
            <Radio
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
            <span className="col-start-2 row-start-2 self-center not-peer-data-checked:text-muted-foreground/72 max-sm:col-start-1 max-sm:justify-self-center max-sm:text-center">
              {item.label}
            </span>
          </FieldLabel>
        </FieldItem>
      ))}
    </RadioGroup>
  );
}
