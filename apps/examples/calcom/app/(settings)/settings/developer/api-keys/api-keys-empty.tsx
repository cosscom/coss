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

interface ApiKeysEmptyProps {
  onNewClick: () => void;
}

export function ApiKeysEmpty({ onNewClick }: ApiKeysEmptyProps) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <KeyIcon />
        </EmptyMedia>
        <EmptyTitle>No API Keys</EmptyTitle>
        <EmptyDescription>
          You haven&apos;t created any API keys yet. Create one to get started
          with the Cal.com API.
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
