"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@coss/ui/components/avatar";
import { Button } from "@coss/ui/components/button";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@coss/ui/components/collapsible";
import { Frame, FrameHeader, FramePanel } from "@coss/ui/components/frame";
import { Input } from "@coss/ui/components/input";
import { Label } from "@coss/ui/components/label";
import {
  Sheet,
  SheetClose,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
} from "@coss/ui/components/sheet";
import { Switch } from "@coss/ui/components/switch";
import { toastManager } from "@coss/ui/components/toast";
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import { ChevronDownIcon, UsersIcon } from "lucide-react";
import { useMemo, useState } from "react";

import {
  ListItem,
  ListItemActions,
  ListItemContent,
  ListItemDescription,
  ListItemHeader,
  ListItemTitle,
} from "@/components/list-item";

interface FeatureFlag {
  slug: string;
  description: string;
  enabled: boolean;
  type: string;
}

interface AssignableUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

const FEATURE_FLAGS: FeatureFlag[] = [
  {
    description: "Enable calendar caching for improved performance",
    enabled: true,
    slug: "calendar-cache",
    type: "Operations",
  },
  {
    description: "Serve cached calendar data to users",
    enabled: true,
    slug: "calendar-cache-serve",
    type: "Operations",
  },
  {
    description: "Enable email notifications",
    enabled: true,
    slug: "emails",
    type: "Operations",
  },
  {
    description: "Enable insights dashboard",
    enabled: true,
    slug: "insights",
    type: "Operations",
  },
  {
    description: "Enable team functionality",
    enabled: true,
    slug: "teams",
    type: "Operations",
  },
  {
    description: "Enable webhook integrations",
    enabled: true,
    slug: "webhooks",
    type: "Operations",
  },
  {
    description: "Enable workflow automations",
    enabled: true,
    slug: "workflows",
    type: "Operations",
  },
  {
    description: "Enable organization features",
    enabled: true,
    slug: "organizations",
    type: "Operations",
  },
  {
    description: "Require email verification during sign up",
    enabled: true,
    slug: "email-verification",
    type: "Operations",
  },
  {
    description: "Disable new user signups",
    enabled: false,
    slug: "disable-signup",
    type: "Operations",
  },
  {
    description: "Enable Google Workspace directory integration",
    enabled: false,
    slug: "google-workspace-directory",
    type: "Experiment",
  },
  {
    description: "Enable user attributes for routing",
    enabled: true,
    slug: "attributes",
    type: "Experiment",
  },
  {
    description: "Use updated organizer request email template",
    enabled: false,
    slug: "organizer-request-email-v2",
    type: "Experiment",
  },
  {
    description: "Enable delegation credential feature",
    enabled: false,
    slug: "delegation-credential",
    type: "Experiment",
  },
  {
    description: "Enable Salesforce CRM tasker integration",
    enabled: false,
    slug: "salesforce-crm-tasker",
    type: "Experiment",
  },
  {
    description: "Use SMTP for workflow emails",
    enabled: false,
    slug: "workflow-smtp-emails",
    type: "Experiment",
  },
  {
    description: "Show log-in overlay on Cal Video",
    enabled: false,
    slug: "cal-video-log-in-overlay",
    type: "Experiment",
  },
  {
    description: "Enable permission-based access control",
    enabled: false,
    slug: "pbac",
    type: "Experiment",
  },
  {
    description: "Enable restriction schedule feature",
    enabled: false,
    slug: "restriction-schedule",
    type: "Experiment",
  },
  {
    description: "Enable new bookings experience (v3)",
    enabled: false,
    slug: "bookings-v3",
    type: "Experiment",
  },
  {
    description: "Enable booking audit logging",
    enabled: false,
    slug: "booking-audit",
    type: "Experiment",
  },
  {
    description: "Enable sidebar tips for onboarding",
    enabled: true,
    slug: "sidebar-tips",
    type: "Killswitch",
  },
  {
    description: "Enable tiered support chat",
    enabled: false,
    slug: "tiered-support-chat",
    type: "Killswitch",
  },
  {
    description: "Review signups against watchlist",
    enabled: false,
    slug: "signup-watchlist-review",
    type: "Killswitch",
  },
];

const USERS: AssignableUser[] = [
  {
    avatarUrl:
      "https://pbs.twimg.com/profile_images/1994776674391457792/7utKOMi6_400x400.jpg",
    email: "pasquale@cal.com",
    id: "usr_pasquale",
    name: "Pasquale Vitiello",
  },
  {
    email: "margaret@cal.com",
    id: "usr_margaret",
    name: "Margaret Welsh",
  },
  {
    email: "brian@cal.com",
    id: "usr_brian",
    name: "Brian Smith",
  },
  {
    email: "anna@cal.com",
    id: "usr_anna",
    name: "Anna Taylor",
  },
  {
    email: "sofia@cal.com",
    id: "usr_sofia",
    name: "Sofia Rodriguez",
  },
  {
    email: "david@cal.com",
    id: "usr_david",
    name: "David Chen",
  },
  {
    email: "elena@cal.com",
    id: "usr_elena",
    name: "Elena Rossi",
  },
  {
    email: "james@cal.com",
    id: "usr_james",
    name: "James Lee",
  },
];

function groupFlagsByType(flags: FeatureFlag[]) {
  const grouped: Record<string, FeatureFlag[]> = {};

  for (const flag of flags) {
    const type = flag.type;
    if (!grouped[type]) {
      grouped[type] = [];
    }
    grouped[type].push(flag);
  }

  return grouped;
}

export function FlagAdminList() {
  const [flags, setFlags] = useState(FEATURE_FLAGS);
  const [activeFlagSlug, setActiveFlagSlug] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isAssignSheetOpen, setIsAssignSheetOpen] = useState(false);
  const [userQuery, setUserQuery] = useState("");

  const filteredUsers = useMemo(() => {
    const normalizedQuery = userQuery.trim().toLowerCase();

    if (!normalizedQuery) return USERS;

    return USERS.filter((user) =>
      [user.name, user.email].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [userQuery]);

  const groupedFlags = groupFlagsByType(flags);
  const sortedTypes = Object.keys(groupedFlags).sort();

  function handleToggle(slug: string, checked: boolean) {
    setFlags((prev) =>
      prev.map((flag) =>
        flag.slug === slug ? { ...flag, enabled: checked } : flag,
      ),
    );
    toastManager.add({
      title: "Flags successfully updated",
      type: "success",
    });
  }

  function handleAssignUsersClick(slug: string) {
    setActiveFlagSlug(slug);
    setIsAssignSheetOpen(true);
  }

  function handleUserAssignedChange(userId: string, checked: boolean) {
    setSelectedUserIds((prev) => {
      if (checked && !prev.includes(userId)) return [...prev, userId];
      if (!checked) return prev.filter((id) => id !== userId);
      return prev;
    });
  }

  function handleSaveAssignments() {
    toastManager.add({
      title: "Users successfully assigned",
      type: "success",
    });
  }

  return (
    <Sheet onOpenChange={setIsAssignSheetOpen} open={isAssignSheetOpen}>
      <div className="flex flex-col gap-4">
        {sortedTypes.map((type) => (
          <FlagGroup
            flags={groupedFlags[type] ?? []}
            key={type}
            onAssignUsers={handleAssignUsersClick}
            onToggle={handleToggle}
            type={type}
          />
        ))}
      </div>

      <SheetPopup variant="inset">
        <SheetHeader>
          <SheetTitle>Assign to users</SheetTitle>
          <SheetDescription>
            {activeFlagSlug
              ? `Assign ${activeFlagSlug} to one or more users.`
              : "Assign this flag to one or more users."}
          </SheetDescription>
        </SheetHeader>

        <SheetPanel className="flex flex-col gap-3">
          <Input
            onChange={(e) => setUserQuery(e.currentTarget.value)}
            placeholder="Search users…"
            value={userQuery}
          />
          <div className="flex flex-col gap-2">
            {filteredUsers.map((user) => {
              const switchId = `assign-flag-user-${user.id}`;

              return (
                <Label
                  className="flex items-center justify-between gap-6 rounded-lg border p-3 hover:bg-accent/50 has-data-checked:border-primary/48 has-data-checked:bg-accent/50"
                  htmlFor={switchId}
                  key={user.id}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="size-8">
                      {user.avatarUrl && (
                        <AvatarImage alt={user.name} src={user.avatarUrl} />
                      )}
                      <AvatarFallback>
                        {user.name
                          .split(" ")
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <p className="truncate font-medium text-sm">
                        {user.name}
                      </p>
                      <p className="truncate text-muted-foreground text-xs">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <Switch
                    checked={selectedUserIds.includes(user.id)}
                    className="[--thumb-size:--spacing(4)] sm:[--thumb-size:--spacing(3)]"
                    id={switchId}
                    onCheckedChange={(checked) =>
                      handleUserAssignedChange(user.id, checked)
                    }
                  />
                </Label>
              );
            })}
          </div>
        </SheetPanel>

        <SheetFooter>
          <SheetClose render={<Button variant="ghost" />}>Cancel</SheetClose>
          <SheetClose onClick={handleSaveAssignments} render={<Button />}>
            Save
          </SheetClose>
        </SheetFooter>
      </SheetPopup>
    </Sheet>
  );
}

interface FlagGroupProps {
  type: string;
  flags: FeatureFlag[];
  onToggle: (slug: string, checked: boolean) => void;
  onAssignUsers: (slug: string) => void;
}

function FlagGroup({ type, flags, onAssignUsers, onToggle }: FlagGroupProps) {
  return (
    <Frame>
      <Collapsible defaultOpen>
        <FrameHeader className="flex-row items-center justify-between px-2 py-2">
          <CollapsibleTrigger
            className="data-panel-open:[&_svg]:rotate-180"
            render={<Button variant="ghost" />}
          >
            <ChevronDownIcon className="size-4" />
            {type}
          </CollapsibleTrigger>
        </FrameHeader>
        <CollapsiblePanel>
          <FramePanel className="p-0">
            {flags.map((flag) => (
              <ListItem key={flag.slug}>
                <ListItemContent>
                  <ListItemHeader>
                    <ListItemTitle>{flag.slug}</ListItemTitle>
                    <ListItemDescription>
                      {flag.description}
                    </ListItemDescription>
                  </ListItemHeader>
                </ListItemContent>
                <ListItemActions>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Switch
                          checked={flag.enabled}
                          onCheckedChange={(checked) =>
                            handleToggle(flag.slug, checked)
                          }
                        />
                      }
                    />
                    <TooltipPopup sideOffset={11}>
                      {flag.enabled ? "Disable flag" : "Enable flag"}
                    </TooltipPopup>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          aria-label="Assign to users"
                          onClick={() => onAssignUsers(flag.slug)}
                          size="icon"
                          variant="outline"
                        >
                          <UsersIcon />
                        </Button>
                      }
                    />
                    <TooltipPopup sideOffset={11}>Assign to users</TooltipPopup>
                  </Tooltip>
                </ListItemActions>
              </ListItem>
            ))}
          </FramePanel>
        </CollapsiblePanel>
      </Collapsible>
    </Frame>
  );

  function handleToggle(slug: string, checked: boolean) {
    onToggle(slug, checked);
  }
}
