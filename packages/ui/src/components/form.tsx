"use client";

import { Form as FormPrimitive } from "@base-ui/react/form";

import { cn } from "@coss/ui/lib/utils";

export function Form({
  className,
  ...props
}: FormPrimitive.Props): JSX.Element {
  return (
    <FormPrimitive
      className={cn("flex w-full flex-col gap-4", className)}
      data-slot="form"
      {...props}
    />
  );
}

export { FormPrimitive };
