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
    <Empty className="rounded-xl border border-dashed py-8 md:py-12">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <KeyIcon />
        </EmptyMedia>
        <EmptyTitle>Create your first API key</EmptyTitle>
        <EmptyDescription>
          API keys allow other apps to communicate with Cal.com
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
