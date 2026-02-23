"use client";

import { Button } from "@coss/ui/components/button";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@coss/ui/components/collapsible";
import { Frame, FrameHeader, FramePanel } from "@coss/ui/components/frame";
import { Switch } from "@coss/ui/components/switch";
import { toastManager } from "@coss/ui/components/toast";
import { ChevronDownIcon, UsersIcon } from "lucide-react";
import { useState } from "react";

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

  return (
    <div className="flex flex-col gap-4">
      {sortedTypes.map((type) => (
        <FlagGroup
          flags={groupedFlags[type] ?? []}
          key={type}
          onToggle={handleToggle}
          type={type}
        />
      ))}
    </div>
  );
}

interface FlagGroupProps {
  type: string;
  flags: FeatureFlag[];
  onToggle: (slug: string, checked: boolean) => void;
}

function FlagGroup({ type, flags, onToggle }: FlagGroupProps) {
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
                  <Switch
                    checked={flag.enabled}
                    onCheckedChange={(checked) =>
                      handleToggle(flag.slug, checked)
                    }
                  />
                  <Button
                    aria-label="Assign to users"
                    size="icon"
                    variant="outline"
                  >
                    <UsersIcon />
                  </Button>
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
