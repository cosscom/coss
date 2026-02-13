"use client";

import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import type { WebhookItem } from "./webhooks-list-content";
import { WebhooksListContent } from "./webhooks-list-content";

interface WebhooksPageContentProps {
  webhooks: WebhookItem[];
}

export function WebhooksPageContent({ webhooks }: WebhooksPageContentProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  return (
    <div className="flex flex-col gap-4">
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
            <Button variant="outline">
              New
              <ChevronDownIcon />
            </Button>
          </div>
        </CardFrameHeader>

        <Card>
          <CardPanel>
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
