"use client";

import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { ChevronRightIcon, KeyIcon } from "lucide-react";
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
}: {
  clients: OAuthClientItem[];
  onEditClick: (client: OAuthClientItem) => void;
}) {
  return (
    <>
      {clients.map((client) => (
        <ListItem key={client.id}>
          <ListItemContent>
            <ListItemHeader>
              <ListItemTitle className="flex items-center gap-2">
                <KeyIcon aria-hidden="true" className="size-4 opacity-80" />
                {client.name}
              </ListItemTitle>
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
            <Button
              aria-label={`Edit ${client.name}`}
              onClick={() => onEditClick(client)}
              size="icon"
              variant="ghost"
            >
              <ChevronRightIcon aria-hidden="true" />
            </Button>
          </ListItemActions>
        </ListItem>
      ))}
    </>
  );
}
