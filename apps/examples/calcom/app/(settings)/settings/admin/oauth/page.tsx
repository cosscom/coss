import { Avatar, AvatarFallback } from "@coss/ui/components/avatar";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import {
  Empty,
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
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import {
  ChevronRightIcon,
  EllipsisIcon,
  KeyRoundIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";
import {
  ListItem,
  ListItemActions,
  ListItemBadges,
  ListItemContent,
  ListItemDescription,
  ListItemHeader,
  ListItemTitle,
} from "@/components/list-item";

interface OAuthClientSubmission {
  email: string;
  id: string;
  name: string;
  status: "approved" | "pending" | "rejected";
}

const OAUTH_CLIENTS: OAuthClientSubmission[] = [
  {
    email: "admin@example.com",
    id: "1",
    name: "another",
    status: "pending",
  },
  {
    email: "admin@example.com",
    id: "2",
    name: "test",
    status: "pending",
  },
];

const STATUS_GROUPS = ["pending", "rejected", "approved"] as const;

const STATUS_LABELS: Record<OAuthClientSubmission["status"], string> = {
  approved: "Approved",
  pending: "Pending",
  rejected: "Rejected",
};

const STATUS_BADGE_VARIANTS: Record<
  OAuthClientSubmission["status"],
  "error" | "success" | "warning"
> = {
  approved: "success",
  pending: "warning",
  rejected: "error",
};

export default function AdminOAuthPage() {
  const grouped = STATUS_GROUPS.map((status) => ({
    clients: OAUTH_CLIENTS.filter((c) => c.status === status),
    label: STATUS_LABELS[status],
    status,
  }));

  return (
    <>
      <AppHeader>
        <AppHeaderContent title="OAuth Clients">
          <AppHeaderDescription>
            Manage and approve OAuth client submissions
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <div className="flex flex-col gap-4">
        {grouped.map((group) => (
          <CardFrame key={group.status}>
            <CardFrameHeader>
              <CardFrameTitle>{group.label}</CardFrameTitle>
            </CardFrameHeader>
            {group.clients.length > 0 ? (
              <Card>
                <CardPanel className="p-0">
                  {group.clients.map((client) => (
                    <ListItem key={client.id}>
                      <Avatar className="size-10">
                        <AvatarFallback>
                          <KeyRoundIcon className="size-4" />
                        </AvatarFallback>
                      </Avatar>
                      <ListItemContent>
                        <ListItemHeader>
                          <ListItemTitle>{client.name}</ListItemTitle>
                          <ListItemDescription>
                            {client.email}
                          </ListItemDescription>
                        </ListItemHeader>
                      </ListItemContent>
                      <ListItemBadges>
                        <Badge
                          className="pointer-events-none"
                          variant={STATUS_BADGE_VARIANTS[client.status]}
                        >
                          {STATUS_LABELS[client.status]}
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
                            <MenuItem>
                              <PencilIcon />
                              Edit
                            </MenuItem>
                            <MenuItem variant="destructive">
                              <Trash2Icon />
                              Remove
                            </MenuItem>
                          </MenuPopup>
                        </Menu>
                        <Button
                          aria-label={`View ${client.name}`}
                          size="icon"
                          variant="ghost"
                        >
                          <ChevronRightIcon />
                        </Button>
                      </ListItemActions>
                    </ListItem>
                  ))}
                </CardPanel>
              </Card>
            ) : (
              <Empty className="rounded-xl border border-dashed py-8 md:py-12">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <KeyRoundIcon />
                  </EmptyMedia>
                  <EmptyTitle>
                    No {group.label.toLowerCase()} clients
                  </EmptyTitle>
                  <EmptyDescription>
                    There are no {group.label.toLowerCase()} OAuth client
                    submissions.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardFrame>
        ))}
      </div>
    </>
  );
}
