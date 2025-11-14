"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/registry/default/ui/button";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/registry/default/ui/collapsible";
import { Separator } from "@/registry/default/ui/separator";

export function CodeCollapsibleWrapper({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Collapsible>) {
  const [isOpened, setIsOpened] = React.useState(false);

  return (
    <Collapsible
      open={isOpened}
      onOpenChange={setIsOpened}
      className={cn("group/collapsible md:-mx-1 relative", className)}
      {...props}
    >
      <div className="absolute top-1.5 right-10 z-10 flex items-center">
        <CollapsibleTrigger
          render={
            <Button variant="ghost" className="text-muted-foreground">
              {isOpened ? "Collapse" : "Expand"}
            </Button>
          }
        />
        <Separator orientation="vertical" className="mx-1.5 h-5" />
      </div>
      <CollapsiblePanel
        className="[&>figure]:md:!mx-0 relative mt-6 h-full overflow-hidden data-closed:max-h-64 [&>figure]:mt-0"
        keepMounted
        hidden={false}
      >
        {children}
      </CollapsiblePanel>
      <CollapsibleTrigger className="-bottom-2 absolute inset-x-0 flex h-20 cursor-pointer items-center justify-center rounded-b-lg bg-gradient-to-b from-transparent via-50% via-background to-background font-medium text-muted-foreground text-sm transition-colors hover:text-foreground group-data-open/collapsible:hidden">
        {isOpened ? "Collapse" : "Expand"}
      </CollapsibleTrigger>
    </Collapsible>
  );
}
