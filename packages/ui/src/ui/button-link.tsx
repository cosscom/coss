"use client";

import { mergeProps } from "@base-ui-components/react/merge-props";
import { useRender } from "@base-ui-components/react/use-render";
import type { VariantProps } from "class-variance-authority";

import { cn } from "@coss/ui/lib/utils";

import { buttonVariants } from "@coss/ui/ui/button";

interface ButtonLinkProps extends useRender.ComponentProps<"a"> {
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
}

function ButtonLink({
  className,
  variant,
  size,
  render,
  ...props
}: ButtonLinkProps) {
  const defaultProps = {
    className: cn(buttonVariants({ className, size, variant })),
    "data-slot": "button",
  };

  return useRender({
    defaultTagName: "a",
    props: mergeProps<"a">(defaultProps, props),
    render,
  });
}

export { ButtonLink };
