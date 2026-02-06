"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@coss/ui/components/avatar";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
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

  return (
    <div>
      {filtered.map((webhook) => (
        <WebhookRow key={webhook.id} webhook={webhook} />
      ))}
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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Avatar className="size-4">
              {webhook.userAvatar ? (
                <AvatarImage alt={webhook.userName} src={webhook.userAvatar} />
              ) : null}
              <AvatarFallback className="text-[.625rem]">
                {webhook.userInitials || getInitials(webhook.userName)}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-sm">{webhook.userName}</span>
          </div>
          {webhook.date != null && <Badge variant="info">{webhook.date}</Badge>}
        </div>
        <ListItemHeader>
          <ListItemTitle className="truncate">{webhook.url}</ListItemTitle>
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
