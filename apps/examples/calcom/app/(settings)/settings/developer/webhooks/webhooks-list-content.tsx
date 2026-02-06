"use client";

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
};

function normalizeWebhook(
  webhook: WebhookItem | { id: string; url: string; events: string },
): WebhookItem {
  if (Array.isArray(webhook.events)) {
    return webhook as WebhookItem;
  }
  return {
    ...webhook,
    events: (webhook.events as string).split(",").map((e) => e.trim()),
  };
}

export function WebhooksListContent({
  webhooks,
}: {
  webhooks: (WebhookItem | { id: string; url: string; events: string })[];
}) {
  const normalized = webhooks.map(normalizeWebhook);

  return (
    <div>
      {normalized.map((webhook) => (
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
        <ListItemHeader className="flex min-w-0 flex-row items-center gap-2">
          <ListItemTitle className="truncate">{webhook.url}</ListItemTitle>
          {webhook.date != null && <Badge variant="info">{webhook.date}</Badge>}
        </ListItemHeader>
        <ListItemBadges className="gap-1.5">
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
