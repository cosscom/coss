"use client";

import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { Checkbox } from "@coss/ui/components/checkbox";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@coss/ui/components/collapsible";
import {
  Drawer,
  DrawerClose,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
} from "@coss/ui/components/drawer";
import { Label } from "@coss/ui/components/label";
import { ToggleGroup, ToggleGroupItem } from "@coss/ui/components/toggle-group";
import { ChevronDownIcon, PlusIcon } from "lucide-react";
import { useCallback, useId, useState } from "react";
import {
  AppHeader,
  AppHeaderActions,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";
import {
  ListItem,
  ListItemContent,
  ListItemHeader,
  ListItemTitle,
} from "@/components/list-item";

const DEFAULT_ROLES = [
  { dotClass: "bg-emerald-500", title: "Owner" },
  { dotClass: "bg-violet-500", title: "Admin" },
  { dotClass: "bg-amber-400", title: "Member" },
] as const;

type Grant = { description: string; id: string; label: string };

const PERMISSION_ROWS = [
  { id: "roles", label: "Roles" },
  { id: "event-types", label: "Event types" },
  { id: "teams", label: "Teams" },
  { id: "bookings", label: "Bookings" },
  { id: "insights", label: "Insights" },
  { id: "workflows", label: "Workflows" },
  { id: "routing-forms", label: "Routing forms" },
  { id: "webhook", label: "Webhook" },
  { id: "feature-opt-in", label: "Feature Opt-In" },
] as const;

type RowId = (typeof PERMISSION_ROWS)[number]["id"];

const PERMISSION_DETAILS: Record<
  RowId,
  { grants: Grant[]; viewGrantId: string }
> = {
  bookings: {
    grants: [
      { description: "View bookings", id: "bookings:view", label: "View" },
      {
        description: "View all team bookings",
        id: "bookings:view-team",
        label: "View team bookings",
      },
      {
        description: "View meeting recordings",
        id: "bookings:recordings",
        label: "View recordings",
      },
      { description: "Edit bookings", id: "bookings:edit", label: "Edit" },
      {
        description: "View audit history",
        id: "bookings:audit",
        label: "View team audit logs",
      },
    ],
    viewGrantId: "bookings:view",
  },
  "event-types": {
    grants: [
      {
        description: "Create event types",
        id: "event-types:create",
        label: "Create",
      },
      {
        description: "View event types",
        id: "event-types:view",
        label: "View",
      },
      {
        description: "Edit event types",
        id: "event-types:edit",
        label: "Edit",
      },
      {
        description: "Delete event types",
        id: "event-types:delete",
        label: "Delete",
      },
    ],
    viewGrantId: "event-types:view",
  },
  "feature-opt-in": {
    grants: [
      {
        description: "View feature flags",
        id: "feature-opt-in:view",
        label: "View",
      },
      {
        description: "Change opt-in settings",
        id: "feature-opt-in:edit",
        label: "Edit",
      },
    ],
    viewGrantId: "feature-opt-in:view",
  },
  insights: {
    grants: [
      { description: "View reports", id: "insights:view", label: "View" },
      { description: "Export data", id: "insights:export", label: "Export" },
    ],
    viewGrantId: "insights:view",
  },
  roles: {
    grants: [
      { description: "Create roles", id: "roles:create", label: "Create" },
      { description: "View roles", id: "roles:view", label: "View" },
      { description: "Edit roles", id: "roles:edit", label: "Edit" },
      { description: "Delete roles", id: "roles:delete", label: "Delete" },
    ],
    viewGrantId: "roles:view",
  },
  "routing-forms": {
    grants: [
      {
        description: "View routing forms",
        id: "routing-forms:view",
        label: "View",
      },
      {
        description: "Edit routing forms",
        id: "routing-forms:edit",
        label: "Edit",
      },
    ],
    viewGrantId: "routing-forms:view",
  },
  teams: {
    grants: [
      { description: "View team details", id: "teams:view", label: "View" },
      { description: "Update team settings", id: "teams:edit", label: "Edit" },
      { description: "Delete team", id: "teams:delete", label: "Delete" },
      { description: "Invite members", id: "teams:invite", label: "Invite" },
      { description: "Remove members", id: "teams:remove", label: "Remove" },
      {
        description: "List team members",
        id: "teams:list-members",
        label: "List members",
      },
      {
        description: "Change member roles",
        id: "teams:change-role",
        label: "Change member role",
      },
      {
        description: "Impersonate members",
        id: "teams:impersonate",
        label: "Impersonate",
      },
    ],
    viewGrantId: "teams:view",
  },
  webhook: {
    grants: [
      { description: "View webhooks", id: "webhook:view", label: "View" },
      { description: "Manage webhooks", id: "webhook:manage", label: "Manage" },
    ],
    viewGrantId: "webhook:view",
  },
  workflows: {
    grants: [
      { description: "View workflows", id: "workflows:view", label: "View" },
      { description: "Edit workflows", id: "workflows:edit", label: "Edit" },
    ],
    viewGrantId: "workflows:view",
  },
};

type PermissionLevel = "all" | "custom" | "none" | "read";

function grantsForMode(
  rowId: RowId,
  mode: PermissionLevel,
  customSnapshot: string[] | undefined,
): string[] {
  const { grants, viewGrantId } = PERMISSION_DETAILS[rowId];
  const allIds = grants.map((g) => g.id);
  if (mode === "none") return [];
  if (mode === "read") return [viewGrantId];
  if (mode === "all") return [...allIds];
  return customSnapshot ?? [];
}

function defaultPermissionLevels(): Record<RowId, PermissionLevel> {
  return Object.fromEntries(
    PERMISSION_ROWS.map((row) => [row.id, "read" as const]),
  ) as Record<RowId, PermissionLevel>;
}

function defaultGrantSelection(): Record<RowId, string[]> {
  return Object.fromEntries(
    PERMISSION_ROWS.map((row) => [
      row.id,
      grantsForMode(row.id, "read", undefined),
    ]),
  ) as Record<RowId, string[]>;
}

function PermissionGrantList({
  disabled,
  grantIds,
  onGrantChange,
  rowId,
}: {
  disabled: boolean;
  grantIds: string[];
  onGrantChange: (grantId: string, checked: boolean) => void;
  rowId: RowId;
}) {
  const baseId = useId();
  const { grants } = PERMISSION_DETAILS[rowId];

  return (
    <div className="flex flex-col gap-3 py-1">
      {grants.map((grant) => {
        const checkboxId = `${baseId}-${grant.id}`;
        const checked = grantIds.includes(grant.id);
        return (
          <div className="flex items-start gap-2" key={grant.id}>
            <Checkbox
              checked={checked}
              disabled={disabled}
              id={checkboxId}
              onCheckedChange={(value) =>
                onGrantChange(grant.id, value === true)
              }
            />
            <div className="flex min-w-0 flex-col gap-1">
              <Label htmlFor={checkboxId}>{grant.label}</Label>
              <p className="text-muted-foreground text-xs">
                {grant.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TeamRolesPageClient() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [levels, setLevels] = useState(() => defaultPermissionLevels());
  const [grantSelection, setGrantSelection] = useState(() =>
    defaultGrantSelection(),
  );
  const [rowExpanded, setRowExpanded] = useState<
    Partial<Record<RowId, boolean>>
  >({});

  const handleLevelChange = useCallback(
    (rowId: RowId, values: readonly string[]) => {
      const next = values[0] as PermissionLevel | undefined;
      if (!next) return;

      setLevels((prevLevels) => {
        const prevMode = prevLevels[rowId];
        setGrantSelection((sel) => {
          const snapshot = sel[rowId];
          let nextIds: string[];
          if (next === "custom") {
            nextIds = grantsForMode(rowId, prevMode, snapshot);
          } else if (next === "none") {
            nextIds = [];
          } else if (next === "read") {
            nextIds = [PERMISSION_DETAILS[rowId].viewGrantId];
          } else {
            nextIds = PERMISSION_DETAILS[rowId].grants.map((g) => g.id);
          }
          return { ...sel, [rowId]: nextIds };
        });
        return { ...prevLevels, [rowId]: next };
      });

      if (next === "custom") {
        setRowExpanded((p) => ({ ...p, [rowId]: true }));
      }
    },
    [],
  );

  const handleGrantToggle = useCallback(
    (rowId: RowId, grantId: string, checked: boolean) => {
      setGrantSelection((prev) => {
        const current = new Set(prev[rowId]);
        if (checked) current.add(grantId);
        else current.delete(grantId);
        return { ...prev, [rowId]: [...current] };
      });
    },
    [],
  );

  return (
    <>
      <AppHeader>
        <AppHeaderContent title="Roles & permissions">
          <AppHeaderDescription>
            Manage roles and permissions for your organization
          </AppHeaderDescription>
        </AppHeaderContent>
        <AppHeaderActions>
          <Button
            className="rounded-lg"
            onClick={() => setDrawerOpen(true)}
            type="button"
          >
            <PlusIcon aria-hidden="true" />
            Create role
          </Button>
        </AppHeaderActions>
      </AppHeader>

      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>Default roles</CardFrameTitle>
        </CardFrameHeader>
        <Card>
          <CardPanel className="p-0">
            {DEFAULT_ROLES.map((role) => (
              <ListItem key={role.title}>
                <ListItemContent>
                  <ListItemHeader className="flex-row items-center gap-3">
                    <span
                      aria-hidden
                      className={`size-2.5 shrink-0 rounded-full ${role.dotClass}`}
                    />
                    <ListItemTitle>{role.title}</ListItemTitle>
                  </ListItemHeader>
                </ListItemContent>
              </ListItem>
            ))}
          </CardPanel>
        </Card>
      </CardFrame>

      <Drawer onOpenChange={setDrawerOpen} open={drawerOpen} position="right">
        <DrawerPopup className="max-w-lg" position="right" variant="inset">
          <DrawerHeader className="pb-3">
            <DrawerTitle>Create role</DrawerTitle>
          </DrawerHeader>
          <DrawerPanel>
            <CardFrame className="w-full">
              <CardFrameHeader className="px-4">
                <CardFrameTitle>Permissions</CardFrameTitle>
              </CardFrameHeader>
              <Card>
                <CardPanel className="p-0">
                  {PERMISSION_ROWS.map((row) => (
                    <ListItem key={row.id} className="*:px-4 *:pt-3 *:pb-0">
                      <ListItemContent className="w-full min-w-0">
                        <Collapsible
                          onOpenChange={(open) =>
                            setRowExpanded((p) => ({ ...p, [row.id]: open }))
                          }
                          open={rowExpanded[row.id] ?? false}
                        >
                          <div className="flex w-full flex-col">
                            <div className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
                              <CollapsibleTrigger className="flex items-center gap-1.5 font-medium text-sm">
                                <ChevronDownIcon
                                  aria-hidden="true"
                                  className="size-4 shrink-0 in-data-panel-open:rotate-180 opacity-80 transition-transform"
                                />
                                {row.label}
                              </CollapsibleTrigger>
                              <ToggleGroup
                                onValueChange={(values) =>
                                  handleLevelChange(row.id, values)
                                }
                                size="sm"
                                value={[levels[row.id]]}
                              >
                                <ToggleGroupItem
                                  aria-label="None"
                                  className="font-normal text-muted-foreground"
                                  value="none"
                                >
                                  None
                                </ToggleGroupItem>
                                <ToggleGroupItem
                                  aria-label="Read"
                                  className="font-normal text-muted-foreground"
                                  value="read"
                                >
                                  Read
                                </ToggleGroupItem>
                                <ToggleGroupItem
                                  aria-label="All"
                                  className="font-normal text-muted-foreground"
                                  value="all"
                                >
                                  All
                                </ToggleGroupItem>
                                <ToggleGroupItem
                                  aria-label="Custom"
                                  className="font-normal text-muted-foreground"
                                  value="custom"
                                >
                                  Custom
                                </ToggleGroupItem>
                              </ToggleGroup>
                            </div>
                            <CollapsiblePanel>
                              <div className="mb-4 rounded-lg bg-muted/72 p-3">
                                <PermissionGrantList
                                  disabled={levels[row.id] !== "custom"}
                                  grantIds={grantSelection[row.id] ?? []}
                                  onGrantChange={(grantId, checked) =>
                                    handleGrantToggle(row.id, grantId, checked)
                                  }
                                  rowId={row.id}
                                />
                              </div>
                            </CollapsiblePanel>
                          </div>
                        </Collapsible>
                      </ListItemContent>
                    </ListItem>
                  ))}
                </CardPanel>
              </Card>
            </CardFrame>
          </DrawerPanel>
          <DrawerFooter>
            <DrawerClose render={<Button type="button" variant="ghost" />}>
              Cancel
            </DrawerClose>
            <Button
              onClick={() => setDrawerOpen(false)}
              type="button"
              variant="default"
            >
              Create
            </Button>
          </DrawerFooter>
        </DrawerPopup>
      </Drawer>
    </>
  );
}
