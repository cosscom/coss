"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@coss/ui/components/avatar";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { Card, CardPanel } from "@coss/ui/components/card";
import {
  Menu,
  MenuCheckboxItem,
  MenuGroup,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@coss/ui/components/menu";
import { Switch } from "@coss/ui/components/switch";
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import { EllipsisIcon, PencilIcon, TrashIcon, WebhookIcon } from "lucide-react";
import { useState } from "react";
import {
  ListItem,
  ListItemActions,
  ListItemBadges,
  ListItemContent,
  ListItemHeader,
  ListItemTitle,
} from "@/components/list-item";

const EVENT_TAGS_VISIBLE = 8;

export type WebhookItem = {
  id: string;
  url: string;
  date?: string;
  events: string[];
  enabled?: boolean;
  userId: string;
  userName: string;
  userAvatar?: string;
  userInitials?: string;
};

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export type UserFilterOption = {
  id: string;
  label: string;
  avatar?: string;
};

export function getUniqueUsers(webhooks: WebhookItem[]): UserFilterOption[] {
  const userMap = new Map<string, UserFilterOption>();

  for (const webhook of webhooks) {
    if (!userMap.has(webhook.userId)) {
      userMap.set(webhook.userId, {
        avatar: webhook.userAvatar,
        id: webhook.userId,
        label: webhook.userName,
      });
    }
  }

  return Array.from(userMap.values());
}

type WebhookInput =
  | WebhookItem
  | {
      id: string;
      url: string;
      events: string;
      userName?: string;
      userAvatar?: string;
      userId?: string;
      userInitials?: string;
    };

function normalizeWebhook(webhook: WebhookInput): WebhookItem {
  if (Array.isArray(webhook.events)) {
    return webhook as WebhookItem;
  }
  const userName = webhook.userName || "Default User";
  return {
    ...webhook,
    events: webhook.events.split(",").map((e) => e.trim()),
    userAvatar: webhook.userAvatar,
    userId: webhook.userId || "default",
    userInitials: webhook.userInitials || getInitials(userName),
    userName,
  };
}

function groupWebhooksByUser(webhooks: WebhookItem[]) {
  const groups = new Map<string, WebhookItem[]>();
  for (const webhook of webhooks) {
    const existing = groups.get(webhook.userId) ?? [];
    existing.push(webhook);
    groups.set(webhook.userId, existing);
  }
  return Array.from(groups.entries()).map(([userId, items]) => {
    const first = items[0];
    return {
      userAvatar: first?.userAvatar,
      userId,
      userInitials: first?.userInitials ?? getInitials(first?.userName ?? ""),
      userName: first?.userName ?? "Unknown",
      webhooks: items,
    };
  });
}

export function WebhooksListContent({
  webhooks,
  selectedUserIds,
}: {
  webhooks: WebhookInput[];
  selectedUserIds?: string[];
}) {
  const normalized = webhooks.map(normalizeWebhook);
  const filtered =
    selectedUserIds && selectedUserIds.length > 0
      ? normalized.filter((webhook) => selectedUserIds.includes(webhook.userId))
      : normalized;
  const grouped = groupWebhooksByUser(filtered);

  return (
    <div className="flex flex-col gap-6">
      {grouped.map(
        ({ userId, userName, userAvatar, userInitials, webhooks }) => (
          <section key={userId}>
            <div className="mb-3 flex items-center gap-2">
              <Avatar className="size-5">
                {userAvatar ? (
                  <AvatarImage alt={userName} src={userAvatar} />
                ) : null}
                <AvatarFallback className="text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-sm">{userName}</span>
            </div>
            <Card>
              <CardPanel className="p-0">
                {webhooks.map((webhook) => (
                  <WebhookRow key={webhook.id} webhook={webhook} />
                ))}
              </CardPanel>
            </Card>
          </section>
        ),
      )}
    </div>
  );
}

function WebhookRow({ webhook }: { webhook: WebhookItem }) {
  const [enabled, setEnabled] = useState(webhook.enabled ?? true);
  const visibleEvents = webhook.events.slice(0, EVENT_TAGS_VISIBLE);
  const remainingCount = webhook.events.length - EVENT_TAGS_VISIBLE;

  return (
    <ListItem>
      <ListItemContent>
        <ListItemHeader>
          <div className="flex items-center gap-2">
            <ListItemTitle className="truncate font-normal">
              {webhook.url}
            </ListItemTitle>
            {webhook.date != null && (
              <Badge variant="info">{webhook.date}</Badge>
            )}
          </div>
        </ListItemHeader>
        <ListItemBadges>
          {visibleEvents.map((event) => (
            <Badge key={event} variant="outline">
              <WebhookIcon />
              {event}
            </Badge>
          ))}
          {remainingCount > 0 && (
            <Badge variant="outline">+{remainingCount} More</Badge>
          )}
        </ListItemBadges>
      </ListItemContent>
      <ListItemActions>
        <div className="flex items-center gap-4 max-md:hidden">
          <Tooltip>
            <TooltipTrigger
              render={
                <Switch
                  checked={enabled}
                  className="relative"
                  onCheckedChange={setEnabled}
                />
              }
            />
            <TooltipPopup sideOffset={11}>
              {enabled ? "Disable webhook" : "Enable webhook"}
            </TooltipPopup>
          </Tooltip>

          <Menu>
            <Tooltip>
              <MenuTrigger
                render={
                  <TooltipTrigger
                    render={
                      <Button
                        aria-label="Options"
                        size="icon"
                        variant="outline"
                      >
                        <EllipsisIcon />
                      </Button>
                    }
                  />
                }
              />
              <TooltipPopup>Options</TooltipPopup>
            </Tooltip>
            <MenuPopup align="end">
              <MenuItem>
                <PencilIcon />
                Edit
              </MenuItem>
              <MenuItem variant="destructive">
                <TrashIcon />
                Delete
              </MenuItem>
            </MenuPopup>
          </Menu>
        </div>

        <Menu>
          <MenuTrigger
            className="md:hidden"
            render={
              <Button aria-label="Options" size="icon" variant="outline">
                <EllipsisIcon />
              </Button>
            }
          />
          <MenuPopup align="end">
            <MenuItem>
              <PencilIcon />
              Edit
            </MenuItem>
            <MenuSeparator />
            <MenuGroup>
              <MenuCheckboxItem
                checked={enabled}
                onCheckedChange={setEnabled}
                variant="switch"
              >
                Enable webhook
              </MenuCheckboxItem>
            </MenuGroup>
            <MenuSeparator />
            <MenuItem variant="destructive">
              <TrashIcon />
              Delete
            </MenuItem>
          </MenuPopup>
        </Menu>
      </ListItemActions>
    </ListItem>
  );
}
