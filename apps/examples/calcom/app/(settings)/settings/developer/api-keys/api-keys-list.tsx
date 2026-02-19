"use client";

import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from "@coss/ui/components/menu";
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import { EllipsisIcon, PencilIcon, Trash2Icon } from "lucide-react";
import {
  ListItem,
  ListItemActions,
  ListItemBadges,
  ListItemContent,
  ListItemDescription,
  ListItemHeader,
  ListItemTitle,
} from "@/components/list-item";

export interface ApiKeyItem {
  id: string;
  note: string;
  key: string;
  expiresAt: string | null;
  createdAt: string;
  neverExpires: boolean;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getExpirationLabel(item: ApiKeyItem): string {
  if (item.neverExpires) return "Never expires";
  if (!item.expiresAt) return "No expiration set";
  const expiresDate = new Date(item.expiresAt);
  const now = new Date();
  if (expiresDate < now) return `Expired ${formatDate(item.expiresAt)}`;
  return `Expires ${formatDate(item.expiresAt)}`;
}

function getExpirationVariant(item: ApiKeyItem): "success" | "error" {
  if (item.neverExpires) return "success";
  if (!item.expiresAt) return "success";
  const expiresDate = new Date(item.expiresAt);
  const now = new Date();
  return expiresDate < now ? "error" : "success";
}

export function ApiKeysList({
  apiKeys,
  onEditClick,
  onRemoveClick,
}: {
  apiKeys: ApiKeyItem[];
  onEditClick: (apiKey: ApiKeyItem) => void;
  onRemoveClick: (apiKey: ApiKeyItem) => void;
}) {
  return (
    <>
      {apiKeys.map((apiKey) => (
        <ListItem key={apiKey.id}>
          <ListItemContent>
            <ListItemHeader>
              <ListItemTitle>{apiKey.note || "Untitled API Key"}</ListItemTitle>
              <ListItemDescription>
                Created {formatDate(apiKey.createdAt)}
              </ListItemDescription>
            </ListItemHeader>
          </ListItemContent>
          <ListItemBadges>
            <Badge
              className="pointer-events-none"
              variant={getExpirationVariant(apiKey)}
            >
              {getExpirationLabel(apiKey)}
            </Badge>
          </ListItemBadges>
          <ListItemActions>
            <Menu>
              <Tooltip>
                <MenuTrigger
                  render={
                    <TooltipTrigger
                      render={
                        <Button
                          aria-label={`Options for ${apiKey.note || "API key"}`}
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
                <MenuItem onClick={() => onEditClick(apiKey)}>
                  <PencilIcon />
                  Edit
                </MenuItem>
                <MenuItem
                  onClick={() => onRemoveClick(apiKey)}
                  variant="destructive"
                >
                  <Trash2Icon />
                  Delete
                </MenuItem>
              </MenuPopup>
            </Menu>
          </ListItemActions>
        </ListItem>
      ))}
    </>
  );
}
