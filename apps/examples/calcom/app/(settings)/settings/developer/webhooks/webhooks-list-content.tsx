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
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from "@coss/ui/components/menu";
import { EllipsisIcon, WebhookIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import type { CreateForOption } from "./new-webhook-button";
import { NewWebhookButton } from "./new-webhook-button";

export function WebhooksListContent({
  webhooks,
}: {
  webhooks: { id: string; url: string; events: string }[];
}) {
  const router = useRouter();

  function handleCreateFor(option: CreateForOption) {
    router.push(
      `/settings/developer/webhooks/new?for=${encodeURIComponent(option.id)}`,
    );
  }

  if (webhooks.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <WebhookIcon />
          </EmptyMedia>
          <EmptyTitle>Create your first webhook</EmptyTitle>
          <EmptyDescription>
            With webhooks you can receive meeting data in real-time when
            something happens in Cal.com.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <NewWebhookButton onSelect={handleCreateFor} text="Add webhook" />
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <ul className="divide-y">
      {webhooks.map((webhook) => (
        <li
          className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
          key={webhook.id}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-sm">{webhook.url}</p>
            <p className="truncate text-muted-foreground text-xs">
              {webhook.events}
            </p>
          </div>
          <Menu>
            <MenuTrigger
              render={
                <Button
                  aria-label="Webhook options"
                  size="icon-xs"
                  variant="ghost"
                />
              }
            >
              <EllipsisIcon />
            </MenuTrigger>
            <MenuPopup align="end" alignOffset={-4} sideOffset={8}>
              <MenuItem>Edit</MenuItem>
              <MenuItem variant="destructive">Delete</MenuItem>
            </MenuPopup>
          </Menu>
        </li>
      ))}
    </ul>
  );
}
