"use client";

import { Button } from "@coss/ui/components/button";
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import type { WebhookItem } from "./webhooks-list-content";
import { WebhooksListContent } from "./webhooks-list-content";
import {
  AppHeader,
  AppHeaderActions,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";

interface WebhooksPageContentProps {
  webhooks: WebhookItem[];
}

export function WebhooksPageContent({ webhooks }: WebhooksPageContentProps) {
  const [selectedUserIds, _setSelectedUserIds] = useState<string[]>([]);

  return (
    <>
      <AppHeader>
        <AppHeaderContent title="Webhooks">
          <AppHeaderDescription>
            Receive meeting data in real-time when something happens in Cal.com.
          </AppHeaderDescription>
        </AppHeaderContent>
        <AppHeaderActions>
          <Button variant="outline">
            New
            <ChevronDownIcon />
          </Button>
        </AppHeaderActions>
      </AppHeader>
      <WebhooksListContent
        selectedUserIds={selectedUserIds}
        webhooks={webhooks}
      />
    </>
  );
}
