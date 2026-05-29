"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@coss/ui/components/avatar";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { CardFrame, CardFrameFooter } from "@coss/ui/components/card";
import { Checkbox } from "@coss/ui/components/checkbox";
import {
  Combobox,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxTrigger,
  ComboboxValue,
} from "@coss/ui/components/combobox";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@coss/ui/components/input-group";
import { Label } from "@coss/ui/components/label";
import { ScrollArea } from "@coss/ui/components/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import { cn } from "@coss/ui/lib/utils";
import {
  type Column,
  type ColumnDef,
  type ColumnSizingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FunnelIcon,
  PlusIcon,
  SearchIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import type { ComponentProps, CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";

type MemberRole = "Developer" | "Admin" | "Owner" | "Support" | "Member";

type RoleFilter = "all" | MemberRole;

type ColumnKey =
  | "role"
  | "teams"
  | "seniority"
  | "preferredLanguage"
  | "products"
  | "userCount"
  | "region"
  | "lastActive";

type ColumnToggleItem = { label: string; value: ColumnKey };

const COLUMN_TOGGLE_ITEMS: ColumnToggleItem[] = [
  { label: "Role", value: "role" },
  { label: "Teams", value: "teams" },
  { label: "Seniority", value: "seniority" },
  { label: "Preferred Language", value: "preferredLanguage" },
  { label: "Products", value: "products" },
  { label: "User Count", value: "userCount" },
  { label: "Region", value: "region" },
  { label: "Last active", value: "lastActive" },
];

const ROLE_FILTER_ITEMS: { label: string; value: RoleFilter }[] = [
  { label: "All members", value: "all" },
  { label: "Developers", value: "Developer" },
  { label: "Admins", value: "Admin" },
  { label: "Owners", value: "Owner" },
  { label: "Support", value: "Support" },
  { label: "Members", value: "Member" },
];

const DEFAULT_COLUMN_VISIBILITY: Record<ColumnKey, boolean> = {
  lastActive: true,
  preferredLanguage: true,
  products: true,
  region: true,
  role: true,
  seniority: true,
  teams: true,
  userCount: true,
};

type Member = {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  teams: string[];
  seniority?: string;
  preferredLanguage?: string;
  products: string[];
  userCount?: string[];
  region?: string;
  lastActive: string;
  avatarUrl?: string;
};

const members: Member[] = [
  {
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&q=80",
    email: "hariom@cal.com",
    id: "hariom",
    lastActive: "5/7/2026",
    name: "Hariom",
    preferredLanguage: "German",
    products: ["Organizations"],
    region: "California",
    role: "Developer",
    seniority: "Senior",
    teams: ["Team", "Engineering", "Design", "Product"],
  },
  {
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop&q=80",
    email: "sarah@cal.com",
    id: "sarah-chen",
    lastActive: "5/12/2026",
    name: "Sarah Chen",
    products: ["Organizations", "Enterprise", "Teams", "Routing"],
    role: "Admin",
    seniority: "Senior",
    teams: ["Engineering", "Leadership"],
    userCount: ["51-100", "101-250", "251-500"],
  },
  {
    avatarUrl:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=128&h=128&fit=crop&q=80",
    email: "marcus@cal.com",
    id: "marcus-johnson",
    lastActive: "5/15/2026",
    name: "Marcus Johnson",
    preferredLanguage: "English",
    products: ["Enterprise"],
    role: "Owner",
    teams: ["Leadership", "Sales", "Marketing", "Support"],
  },
  {
    email: "emma@cal.com",
    id: "emma-wilson",
    lastActive: "5/3/2026",
    name: "Emma Wilson",
    products: ["Organizations", "Teams"],
    role: "Support",
    teams: ["Support", "Customer Success"],
  },
  {
    avatarUrl:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=128&h=128&fit=crop&q=80",
    email: "lisa@cal.com",
    id: "lisa-park",
    lastActive: "5/18/2026",
    name: "Lisa Park",
    preferredLanguage: "French",
    products: ["Routing", "Workflows", "Insights"],
    region: "California",
    role: "Developer",
    seniority: "Senior",
    teams: ["Engineering"],
    userCount: ["101-250"],
  },
  {
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=128&h=128&fit=crop&q=80",
    email: "james@cal.com",
    id: "james-rivera",
    lastActive: "5/10/2026",
    name: "James Rivera",
    products: ["Organizations"],
    role: "Member",
    teams: ["Marketing", "Growth", "Content"],
  },
  {
    avatarUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=128&h=128&fit=crop&q=80",
    email: "nina@cal.com",
    id: "nina-kowalski",
    lastActive: "5/6/2026",
    name: "Nina Kowalski",
    preferredLanguage: "German",
    products: ["Enterprise", "Organizations"],
    role: "Admin",
    teams: ["Product", "Design", "Engineering", "QA", "DevOps"],
  },
  {
    email: "david@cal.com",
    id: "david-okonkwo",
    lastActive: "5/14/2026",
    name: "David Okonkwo",
    products: ["Teams"],
    role: "Developer",
    seniority: "Senior",
    teams: ["Engineering", "Platform"],
    userCount: ["51-100", "101-250"],
  },
  {
    avatarUrl:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=128&h=128&fit=crop&q=80",
    email: "olivia@cal.com",
    id: "olivia-martinez",
    lastActive: "5/2/2026",
    name: "Olivia Martinez",
    preferredLanguage: "English",
    products: [],
    region: "California",
    role: "Support",
    teams: ["Support"],
  },
  {
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&q=80",
    email: "alex@cal.com",
    id: "alex-thompson",
    lastActive: "5/16/2026",
    name: "Alex Thompson",
    products: ["Organizations", "Enterprise", "Insights"],
    role: "Owner",
    teams: ["Leadership"],
  },
  {
    email: "priya@cal.com",
    id: "priya-sharma",
    lastActive: "5/9/2026",
    name: "Priya Sharma",
    preferredLanguage: "French",
    products: ["Workflows"],
    role: "Member",
    teams: ["Customer Success", "Onboarding", "Training"],
  },
  {
    avatarUrl:
      "https://images.unsplash.com/photo-1504593811423-6dd665756598?w=128&h=128&fit=crop&q=80",
    email: "ryan@cal.com",
    id: "ryan-foster",
    lastActive: "5/11/2026",
    name: "Ryan Foster",
    products: ["Routing", "Apps"],
    role: "Developer",
    seniority: "Senior",
    teams: ["Engineering", "Infrastructure"],
    userCount: ["251-500", "501-1000", "1000+"],
  },
];

const PRIVILEGED_ROLES: MemberRole[] = ["Developer", "Admin", "Owner"];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]?.charAt(0).toUpperCase() ?? "";
  return `${parts[0]?.charAt(0) ?? ""}${parts.at(-1)?.charAt(0) ?? ""}`.toUpperCase();
}

function TruncatedBadge({
  children,
  className,
  ...props
}: ComponentProps<typeof Badge>) {
  return (
    <Badge
      className={cn("min-w-0 max-w-full shrink overflow-hidden", className)}
      {...props}
    >
      <span className="min-w-0 truncate">{children}</span>
    </Badge>
  );
}

function RoleBadge({ role }: { role: MemberRole }) {
  return (
    <TruncatedBadge
      variant={PRIVILEGED_ROLES.includes(role) ? "info" : "secondary"}
    >
      {role}
    </TruncatedBadge>
  );
}

function BadgeList({
  items,
  visibleCount = 2,
}: {
  items: string[];
  visibleCount?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (items.length === 0) return null;

  const visible = isExpanded ? items : items.slice(0, visibleCount);
  const remaining = items.length - visible.length;

  return (
    <div className="flex w-full min-w-0 flex-wrap gap-1">
      {visible.map((item) => (
        <TruncatedBadge key={item} variant="secondary">
          {item}
        </TruncatedBadge>
      ))}
      {remaining > 0 ? (
        <TruncatedBadge
          aria-label={`Show ${remaining} more ${remaining === 1 ? "badge" : "badges"}`}
          className="tabular-nums"
          onClick={() => setIsExpanded(true)}
          render={<button type="button" />}
          variant="secondary"
        >
          +{remaining}
        </TruncatedBadge>
      ) : null}
    </div>
  );
}

function OptionalBadge({ value }: { value?: string }) {
  if (!value) return null;
  return <TruncatedBadge variant="secondary">{value}</TruncatedBadge>;
}

const FILLER_EXCLUDED_COLUMN_IDS = new Set(["select", "actions"]);

const INITIAL_COLUMN_PINNING = {
  left: ["select", "name"],
  right: ["actions"],
};

function getPinningStyles(column: Column<Member>): CSSProperties {
  const isPinned = column.getIsPinned();

  return {
    "--pinned-left-offset":
      isPinned === "left" ? `${column.getStart("left")}px` : undefined,
    left: undefined,
    position: isPinned === "right" ? "sticky" : undefined,
    right: isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
    zIndex: isPinned ? 1 : 0,
  } as CSSProperties;
}

function getPinnedDataAttribute(column: Column<Member>): {
  "data-pinned"?: "left" | "right";
} {
  const isPinned = column.getIsPinned();
  return isPinned ? { "data-pinned": isPinned } : {};
}

function shouldIgnoreRowSelectionClick(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest(
      'a, button, input, select, textarea, [role="button"], [role="checkbox"], [data-slot="checkbox"], [data-slot="label"]',
    ) !== null
  );
}

function getFillerColumnId(headers: { column: { id: string } }[]): string {
  for (let i = headers.length - 1; i >= 0; i--) {
    const id = headers[i]?.column.id;
    if (id && !FILLER_EXCLUDED_COLUMN_IDS.has(id)) return id;
  }
  return "name";
}

function getColumnDisplayWidth({
  columnId,
  columnsTotalSize,
  fillerColumnId,
  headers,
  size,
  tableWidth,
}: {
  columnId: string;
  columnsTotalSize: number;
  fillerColumnId: string;
  headers: { column: { id: string }; getSize: () => number }[];
  size: number;
  tableWidth: number;
}): number {
  if (tableWidth <= columnsTotalSize || columnId !== fillerColumnId) {
    return size;
  }

  const otherSum = headers
    .filter((header) => header.column.id !== fillerColumnId)
    .reduce((sum, header) => sum + header.getSize(), 0);

  return Math.max(size, tableWidth - otherSum);
}

function getColumns(
  columnVisibility: Record<ColumnKey, boolean>,
): ColumnDef<Member>[] {
  const cols: ColumnDef<Member>[] = [
    {
      cell: ({ row }) => (
        <Label>
          <Checkbox
            aria-label={`Select ${row.original.name}`}
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
          />
        </Label>
      ),
      enableSorting: false,
      header: ({ table }) => (
        <Checkbox
          aria-label="Select all"
          checked={table.getIsAllRowsSelected()}
          indeterminate={
            table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()
          }
          onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
        />
      ),
      enableResizing: false,
      id: "select",
      size: 28,
    },
    {
      accessorKey: "name",
      minSize: 160,
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-8 shrink-0">
            {row.original.avatarUrl ? (
              <AvatarImage
                alt={row.original.name}
                src={row.original.avatarUrl}
              />
            ) : null}
            <AvatarFallback>{getInitials(row.original.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-sm">
              {row.original.name}
            </div>
            <div className="truncate text-muted-foreground text-sm">
              {row.original.email}
            </div>
          </div>
        </div>
      ),
      header: "Members",
      size: 220,
    },
  ];

  if (columnVisibility.role) {
    cols.push({
      accessorKey: "role",
      cell: ({ row }) => <RoleBadge role={row.original.role} />,
      header: "Role",
      minSize: 80,
      size: 100,
    });
  }

  if (columnVisibility.teams) {
    cols.push({
      accessorKey: "teams",
      cell: ({ row }) => <BadgeList items={row.original.teams} />,
      enableSorting: false,
      header: "Teams",
      minSize: 120,
      size: 180,
    });
  }

  if (columnVisibility.seniority) {
    cols.push({
      accessorKey: "seniority",
      cell: ({ row }) => <OptionalBadge value={row.original.seniority} />,
      header: "Seniority",
      minSize: 80,
      size: 100,
    });
  }

  if (columnVisibility.preferredLanguage) {
    cols.push({
      accessorKey: "preferredLanguage",
      cell: ({ row }) => (
        <OptionalBadge value={row.original.preferredLanguage} />
      ),
      header: "Preferred Language",
      minSize: 100,
      size: 140,
    });
  }

  if (columnVisibility.products) {
    cols.push({
      accessorKey: "products",
      cell: ({ row }) => <BadgeList items={row.original.products} />,
      enableSorting: false,
      header: "Products",
      minSize: 120,
      size: 180,
    });
  }

  if (columnVisibility.userCount) {
    cols.push({
      accessorKey: "userCount",
      cell: ({ row }) => <BadgeList items={row.original.userCount ?? []} />,
      enableSorting: false,
      header: "User Count",
      minSize: 100,
      size: 140,
    });
  }

  if (columnVisibility.region) {
    cols.push({
      accessorKey: "region",
      cell: ({ row }) => <OptionalBadge value={row.original.region} />,
      header: "Region",
      minSize: 80,
      size: 110,
    });
  }

  if (columnVisibility.lastActive) {
    cols.push({
      accessorKey: "lastActive",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground text-sm">
          {row.original.lastActive}
        </span>
      ),
      enableResizing: false,
      header: "Last active",
      minSize: 90,
      size: 100,
    });
  }

  cols.push({
    cell: ({ row }) => (
      <div className="flex justify-end">
        <Button
          aria-label={`Open ${row.original.name}`}
          size="icon-sm"
          variant="outline"
        >
          <ArrowUpRightIcon aria-hidden="true" />
        </Button>
      </div>
    ),
    enableResizing: false,
    enableSorting: false,
    header: () => <span className="sr-only">Actions</span>,
    id: "actions",
    size: 48,
  });

  return cols;
}

export function MembersPageClient() {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [searchValue, setSearchValue] = useState("");
  const [columnVisibility, setColumnVisibility] = useState(
    DEFAULT_COLUMN_VISIBILITY,
  );
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [rowSelection, setRowSelection] = useState({});
  const [sorting, setSorting] = useState<SortingState>([
    { desc: false, id: "name" },
  ]);

  const filteredMembers = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    return members.filter((member) => {
      const matchesRole = roleFilter === "all" || member.role === roleFilter;
      const matchesQuery =
        query.length === 0 ||
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query) ||
        member.role.toLowerCase().includes(query) ||
        member.teams.some((team) => team.toLowerCase().includes(query));

      return matchesRole && matchesQuery;
    });
  }, [roleFilter, searchValue]);

  const columns = useMemo(
    () => getColumns(columnVisibility),
    [columnVisibility],
  );

  const firstRoleFilterItem = ROLE_FILTER_ITEMS[0];
  const roleFilterItem =
    ROLE_FILTER_ITEMS.find((item) => item.value === roleFilter) ??
    (firstRoleFilterItem !== undefined
      ? firstRoleFilterItem
      : { label: "All members", value: "all" as const });

  const columnToggleValue = useMemo((): ColumnToggleItem[] => {
    return COLUMN_TOGGLE_ITEMS.filter((item) => columnVisibility[item.value]);
  }, [columnVisibility]);

  useEffect(() => {
    setSorting((previous) => {
      const hiddenIds = (
        Object.entries(columnVisibility) as [ColumnKey, boolean][]
      )
        .filter(([, visible]) => !visible)
        .map(([id]) => id);
      const next = previous.filter(
        (s) => !hiddenIds.includes(s.id as ColumnKey),
      );
      return next.length > 0 ? next : [{ desc: false, id: "name" }];
    });
  }, [columnVisibility]);

  useEffect(() => {
    const node = tableContainerRef.current;
    if (!node) return;

    const updateWidth = (): void => {
      setContainerWidth(node.clientWidth);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const table = useReactTable({
    columnResizeMode: "onChange",
    columns,
    data: filteredMembers,
    enableRowSelection: true,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      columnPinning: INITIAL_COLUMN_PINNING,
    },
    onColumnSizingChange: setColumnSizing,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    state: {
      columnSizing,
      rowSelection,
      sorting,
    },
  });

  const headers = table.getHeaderGroups()[0]?.headers ?? [];
  const columnsTotalSize = table.getCenterTotalSize();
  const tableWidth =
    containerWidth > 0
      ? Math.max(containerWidth + 2, columnsTotalSize)
      : columnsTotalSize;
  const fillerColumnId = getFillerColumnId(headers);

  return (
    <>
      <AppHeader>
        <AppHeaderContent title="Members">
          <AppHeaderDescription>
            Manage organization members and their access.
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>

      <div className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <InputGroup className="w-full sm:max-w-52">
              <InputGroupInput
                aria-label="Search members"
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search"
                type="search"
                value={searchValue}
              />
              <InputGroupAddon>
                <SearchIcon aria-hidden="true" />
              </InputGroupAddon>
            </InputGroup>

            <Combobox
              autoHighlight
              items={COLUMN_TOGGLE_ITEMS}
              multiple
              onValueChange={(items) => {
                const selected = new Set(
                  (items ?? []).map((item) => item.value),
                );
                setColumnVisibility(
                  Object.fromEntries(
                    COLUMN_TOGGLE_ITEMS.map((item) => [
                      item.value,
                      selected.has(item.value),
                    ]),
                  ) as Record<ColumnKey, boolean>,
                );
              }}
              value={columnToggleValue}
            >
              <ComboboxTrigger
                render={<Button aria-label="Display" variant="outline" />}
              >
                <SlidersHorizontalIcon aria-hidden="true" />
                Display
              </ComboboxTrigger>
              <ComboboxPopup align="start" aria-label="Toggle columns">
                <div className="border-b p-2">
                  <ComboboxInput
                    placeholder="Search"
                    showTrigger={false}
                    size="sm"
                    startAddon={<SearchIcon aria-hidden="true" />}
                  />
                </div>
                <ComboboxEmpty>No columns found.</ComboboxEmpty>
                <ComboboxList>
                  {(item: ColumnToggleItem) => (
                    <ComboboxItem key={item.value} value={item}>
                      {item.label}
                    </ComboboxItem>
                  )}
                </ComboboxList>
                <div className="border-t p-2">
                  <Button
                    className="w-full"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setColumnVisibility(DEFAULT_COLUMN_VISIBILITY)
                    }
                  >
                    Show all columns
                  </Button>
                </div>
              </ComboboxPopup>
            </Combobox>

            <Combobox
              items={ROLE_FILTER_ITEMS}
              onValueChange={(item) => item && setRoleFilter(item.value)}
              value={roleFilterItem}
            >
              <ComboboxTrigger render={<Button variant="outline" />}>
                <FunnelIcon aria-hidden="true" />
                <ComboboxValue />
              </ComboboxTrigger>
              <ComboboxPopup align="start" aria-label="Filter by role">
                <ComboboxEmpty>No roles found.</ComboboxEmpty>
                <ComboboxList>
                  <ComboboxGroup items={ROLE_FILTER_ITEMS}>
                    <ComboboxGroupLabel>Role</ComboboxGroupLabel>
                    <ComboboxCollection>
                      {(item: (typeof ROLE_FILTER_ITEMS)[number]) => (
                        <ComboboxItem key={item.value} value={item}>
                          {item.label}
                        </ComboboxItem>
                      )}
                    </ComboboxCollection>
                  </ComboboxGroup>
                </ComboboxList>
              </ComboboxPopup>
            </Combobox>
          </div>

          <Button>
            <PlusIcon aria-hidden="true" />
            Add
          </Button>
        </div>

        <CardFrame
          className="w-full before:bg-[color-mix(in_srgb,var(--color-black)_3%,var(--background))] **:data-[slot=table-container]:overflow-x-visible dark:before:bg-[color-mix(in_srgb,var(--color-white)_4.6%,var(--background))]"
          ref={tableContainerRef}
        >
          <Table
            render={
              <ScrollArea className="**:data-[slot=scroll-area-scrollbar]:z-10 **:data-[slot=scroll-area-scrollbar]:translate-y-3" />
            }
            className="table-fixed [--border:color-mix(in_srgb,var(--color-black)_8%,color-mix(in_srgb,var(--color-black)_3%,var(--background)))] dark:[--border:color-mix(in_srgb,var(--color-white)_6%,color-mix(in_srgb,var(--color-white)_4.6%,var(--background)))]"
            variant="card"
          >
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      aria-sort={
                        header.column.getIsSorted() === "asc"
                          ? "ascending"
                          : header.column.getIsSorted() === "desc"
                            ? "descending"
                            : "none"
                      }
                      className="relative z-1 select-none bg-[color-mix(in_srgb,var(--color-black)_3%,var(--background))] before:pointer-events-none before:absolute before:inset-y-0 before:z-1 not-data-pinned:before:hidden before:w-4 before:from-[color-mix(in_srgb,var(--color-black)_3%,var(--background))] before:to-transparent data-[pinned=left]:before:start-full data-[pinned=right]:before:end-full in-data-overflow-x-end:data-[pinned=right]:before:bg-linear-to-l last:*:data-[slot=column-resize-handle]:opacity-0 data-[pinned=left]:max-md:before:hidden data-[pinned=left]:md:sticky data-[pinned=left]:md:left-(--pinned-left-offset) in-data-overflow-x-start:data-[pinned=left]:md:before:bg-linear-to-r dark:bg-[color-mix(in_srgb,var(--color-white)_4.6%,var(--background))] dark:before:from-[color-mix(in_srgb,var(--color-white)_4.6%,var(--background))]"
                      colSpan={header.colSpan}
                      key={header.id}
                      {...getPinnedDataAttribute(header.column)}
                      style={{
                        ...getPinningStyles(header.column),
                        width: getColumnDisplayWidth({
                          columnId: header.column.id,
                          columnsTotalSize,
                          fillerColumnId,
                          headers,
                          size: header.getSize(),
                          tableWidth,
                        }),
                      }}
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <div
                          className="flex h-full cursor-pointer select-none items-center justify-between gap-2"
                          onClick={header.column.getToggleSortingHandler()}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              header.column.getToggleSortingHandler()?.(event);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <span className="truncate text-sm">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                          </span>
                          {{
                            asc: (
                              <ChevronUpIcon
                                aria-hidden="true"
                                className="size-4 shrink-0 opacity-80"
                              />
                            ),
                            desc: (
                              <ChevronDownIcon
                                aria-hidden="true"
                                className="size-4 shrink-0 opacity-80"
                              />
                            ),
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      ) : (
                        <span className="truncate">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        </span>
                      )}
                      {header.column.getCanResize() ? (
                        <div
                          aria-hidden="true"
                          className="user-select-none absolute -end-2 top-0 z-10 flex h-full w-4 touch-none items-center justify-center before:absolute before:inset-y-2 before:w-px before:-translate-x-px before:bg-input"
                          data-slot="column-resize-handle"
                          onDoubleClick={() => header.column.resetSize()}
                          onMouseDown={header.getResizeHandler()}
                          style={{ cursor: "col-resize" }}
                          onTouchStart={header.getResizeHandler()}
                        />
                      ) : null}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className="in-data-overflow-x-start:before:rounded-ss-none in-data-overflow-x-end:before:rounded-se-none in-data-overflow-x-start:in-data-[variant=card]:*:[tr]:first:*:[td]:first:rounded-ss-none in-data-overflow-x-end:in-data-[variant=card]:*:[tr]:last:*:[td]:last:rounded-ee-none in-data-overflow-x-end:in-data-[variant=card]:*:[tr]:first:*:[td]:last:rounded-se-none in-data-overflow-x-start:in-data-[variant=card]:*:[tr]:last:*:[td]:first:rounded-es-none">
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    key={row.id}
                    onClick={(event) => {
                      if (shouldIgnoreRowSelectionClick(event.target)) return;
                      row.toggleSelected();
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        className="before:pointer-events-none before:absolute before:inset-y-0 before:z-1 not-data-pinned:before:hidden before:w-4 before:from-card in-[[data-slot=table-row]:hover]:before:from-[color-mix(in_srgb,var(--card),var(--color-black)_2%)] in-[[data-slot=table-row][data-state=selected]]:before:from-[color-mix(in_srgb,var(--card),var(--color-black)_4%)] before:to-transparent data-[pinned=left]:before:start-full data-[pinned=right]:before:end-full in-data-overflow-x-end:data-[pinned=right]:before:bg-linear-to-l data-[pinned=left]:max-md:before:hidden data-[pinned=left]:md:sticky data-[pinned=left]:md:left-(--pinned-left-offset) in-data-overflow-x-start:data-[pinned=left]:md:before:bg-linear-to-r dark:in-[[data-slot=table-row]:hover]:before:from-[color-mix(in_srgb,var(--card),var(--color-white)_2%)] dark:in-[[data-slot=table-row][data-state=selected]]:before:from-[color-mix(in_srgb,var(--card),var(--color-white)_4%)]"
                        key={cell.id}
                        {...getPinnedDataAttribute(cell.column)}
                        style={{
                          ...getPinningStyles(cell.column),
                          width: getColumnDisplayWidth({
                            columnId: cell.column.id,
                            columnsTotalSize,
                            fillerColumnId,
                            headers,
                            size: cell.column.getSize(),
                            tableWidth,
                          }),
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    className="h-24 text-center"
                    colSpan={columns.length}
                  >
                    No members found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <CardFrameFooter className="flex items-center justify-between gap-2 border-t">
            <p className="text-muted-foreground text-sm">
              {table.getFilteredSelectedRowModel().rows.length > 0 ? (
                <>
                  <strong className="font-medium text-foreground">
                    {table.getFilteredSelectedRowModel().rows.length}
                  </strong>{" "}
                  of{" "}
                  <strong className="font-medium text-foreground">
                    {table.getFilteredRowModel().rows.length}
                  </strong>{" "}
                  selected
                </>
              ) : (
                <>
                  <strong className="font-medium text-foreground">
                    {table.getFilteredRowModel().rows.length}
                  </strong>{" "}
                  members
                </>
              )}
            </p>
          </CardFrameFooter>
        </CardFrame>
      </div>
    </>
  );
}
