"use client";

import { Button } from "@coss/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@coss/ui/components/empty";
import { CalendarIcon, ExternalLinkIcon } from "lucide-react";

export function CalendarsEmpty() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CalendarIcon />
        </EmptyMedia>
        <EmptyTitle>No calendar apps</EmptyTitle>
        <EmptyDescription>
          You have not yet connected any calendar apps. Connect a calendar app
          to get started.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline">
          Connect your first calendar
          <ExternalLinkIcon />
        </Button>
      </EmptyContent>
    </Empty>
  );
}
