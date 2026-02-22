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
import { KeyIcon, PlusIcon } from "lucide-react";

interface OAuthEmptyProps {
  onNewClick: () => void;
}

export function OAuthEmpty({ onNewClick }: OAuthEmptyProps) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <KeyIcon />
        </EmptyMedia>
        <EmptyTitle>No OAuth Clients</EmptyTitle>
        <EmptyDescription>
          You haven&apos;t created any OAuth clients yet. Create one to get
          started.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onNewClick} variant="outline">
          <PlusIcon />
          New
        </Button>
      </EmptyContent>
    </Empty>
  );
}
