import { mergeProps } from "@base-ui-components/react/merge-props";
import { useRender } from "@base-ui-components/react/use-render";

import { cn } from "@coss/ui/lib/utils";

function Label({
  className,
  render,
  ...props
}: useRender.ComponentProps<"label">) {
  const defaultProps = {
    className: cn(
      "inline-flex items-center gap-2 [--scale-offset:var(--ui-scale-offset-mobile,0rem)] sm:[--scale-offset:var(--ui-scale-offset,0rem)] text-[calc(var(--text-sm)+var(--scale-offset)/2)]/[calc(--spacing(4)+var(--scale-offset)/2)]",
      className,
    ),
    "data-slot": "label",
  };

  return useRender({
    defaultTagName: "label",
    props: mergeProps<"label">(defaultProps, props),
    render,
  });
}

export { Label };
