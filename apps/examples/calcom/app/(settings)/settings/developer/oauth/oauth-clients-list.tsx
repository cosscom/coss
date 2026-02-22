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
  ListItemHeader,
  ListItemTitle,
} from "@/components/list-item";

export interface OAuthClientItem {
  id: string;
  name: string;
  status: "pending" | "approved" | "rejected";
  clientId: string;
  clientSecret: string;
  purpose?: string;
  redirectUri?: string;
  websiteUrl?: string;
  usePkce?: boolean;
  logo?: string;
}

const statusVariantMap = {
  approved: "success",
  pending: "warning",
  rejected: "error",
} as const;

const statusLabelMap = {
  approved: "Approved",
  pending: "Pending",
  rejected: "Rejected",
} as const;

export function OAuthClientsList({
  clients,
  onEditClick,
  onRemoveClick,
}: {
  clients: OAuthClientItem[];
  onEditClick: (client: OAuthClientItem) => void;
  onRemoveClick: (client: OAuthClientItem) => void;
}) {
  return (
    <>
      {clients.map((client) => (
        <ListItem key={client.id}>
          <ListItemContent>
            <ListItemHeader>
              <ListItemTitle>{client.name}</ListItemTitle>
            </ListItemHeader>
          </ListItemContent>
          <ListItemBadges>
            <Badge
              className="pointer-events-none"
              variant={statusVariantMap[client.status]}
            >
              {statusLabelMap[client.status]}
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
                          aria-label={`Options for ${client.name}`}
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
                <MenuItem onClick={() => onEditClick(client)}>
                  <PencilIcon />
                  Edit
                </MenuItem>
                <MenuItem
                  onClick={() => onRemoveClick(client)}
                  variant="destructive"
                >
                  <Trash2Icon />
                  Remove
                </MenuItem>
              </MenuPopup>
            </Menu>
          </ListItemActions>
        </ListItem>
      ))}
    </>
  );
}
