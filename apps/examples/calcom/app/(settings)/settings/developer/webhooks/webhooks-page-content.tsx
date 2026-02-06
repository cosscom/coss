"use client";

import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { useState } from "react";
import { WebhooksFilter } from "./webhooks-filter";
import type { WebhookItem } from "./webhooks-list-content";
import { WebhooksListContent } from "./webhooks-list-content";

interface WebhooksPageContentProps {
  webhooks: WebhookItem[];
}

export function WebhooksPageContent({ webhooks }: WebhooksPageContentProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  return (
    <div className="space-y-4">
      <CardFrame>
        <CardFrameHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardFrameTitle>Webhooks</CardFrameTitle>
              <CardFrameDescription>
                Receive meeting data in real-time when something happens in
                Cal.com.
              </CardFrameDescription>
            </div>
            <WebhooksFilter
              onSelectionChange={setSelectedUserIds}
              selectedUserIds={selectedUserIds}
              webhooks={webhooks}
            />
          </div>
        </CardFrameHeader>

        <Card>
          <CardPanel className="p-0">
            <WebhooksListContent
              selectedUserIds={selectedUserIds}
              webhooks={webhooks}
            />
          </CardPanel>
        </Card>
      </CardFrame>
    </div>
  );
}
