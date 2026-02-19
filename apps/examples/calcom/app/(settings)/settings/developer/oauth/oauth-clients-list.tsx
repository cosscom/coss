"use client";

import { Avatar, AvatarFallback } from "@coss/ui/components/avatar";
import { Badge } from "@coss/ui/components/badge";
import { ChevronRightIcon, KeyIcon } from "lucide-react";
import {
  ListItem,
  ListItemActions,
  ListItemBadges,
  ListItemContent,
  ListItemHeader,
  ListItemTitle,
  ListItemTitleLink,
} from "@/components/list-item";

export interface OAuthClientItem {
  id: string;
  name: string;
  status: "pending" | "approved" | "rejected";
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

export function OAuthClientsList({ clients }: { clients: OAuthClientItem[] }) {
  return (
    <>
      {clients.map((client) => (
        <ListItem key={client.id}>
          <Avatar className="size-10 shrink-0">
            <AvatarFallback>
              <KeyIcon className="size-4 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <ListItemContent>
            <ListItemHeader>
              <ListItemTitle>
                <ListItemTitleLink href="#">{client.name}</ListItemTitleLink>
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
            <ChevronRightIcon className="size-5 text-muted-foreground" />
          </ListItemActions>
        </ListItem>
      ))}
    </>
  );
}
