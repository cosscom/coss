"use client";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@coss/ui/components/empty";
import { KeyIcon } from "lucide-react";
import { NewOAuthClientDialog } from "./new-oauth-client-dialog";

export function OAuthEmpty() {
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
        <NewOAuthClientDialog />
      </EmptyContent>
    </Empty>
  );
}
