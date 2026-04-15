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
import { LinkIcon, PlusIcon } from "lucide-react";

export function DelegationCredentialEmpty({
  description,
  onAddClick,
}: {
  description: string;
  onAddClick: () => void;
}) {
  return (
    <Empty className="rounded-xl border border-dashed py-8 md:py-12">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <LinkIcon />
        </EmptyMedia>
        <EmptyTitle>Add delegation credential</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onAddClick} type="button">
          <PlusIcon aria-hidden="true" />
          Add delegation credential
        </Button>
      </EmptyContent>
    </Empty>
  );
}
