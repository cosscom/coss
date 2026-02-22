"use client";

import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameAction,
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
  const [selectedUserIds, _setSelectedUserIds] = useState<string[]>([]);

  return (
    <div className="flex flex-col gap-4">
      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>Webhooks</CardFrameTitle>
          <CardFrameDescription>
            Receive meeting data in real-time when something happens in Cal.com.
          </CardFrameDescription>
          <CardFrameAction>
            <Button variant="outline">
              New
              <ChevronDownIcon />
            </Button>
          </CardFrameAction>
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
