"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@coss/ui/components/avatar";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { CardFrame } from "@coss/ui/components/card";
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
import { Group, GroupSeparator } from "@coss/ui/components/group";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@coss/ui/components/input-group";
import { Label } from "@coss/ui/components/label";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@coss/ui/components/menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import {
  type ColumnDef,
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
  EllipsisIcon,
  FunnelIcon,
  PlusIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  UserPlusIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";

type TeamRole = "MEMBER" | "OWNER";
type RoleFilter = "all" | TeamRole;

type ColumnToggleItem = { label: string; value: "role" | "lastActive" };

const COLUMN_TOGGLE_ITEMS: ColumnToggleItem[] = [
  { label: "Role", value: "role" },
  { label: "Last Active", value: "lastActive" },
];

const ROLE_FILTER_ITEMS: { label: string; value: RoleFilter }[] = [
  { label: "All members", value: "all" },
  { label: "Owners", value: "OWNER" },
  { label: "Members", value: "MEMBER" },
];

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  lastActive: string;
  avatarUrl?: string;
  hasOptions?: boolean;
};

const members: TeamMember[] = [
  {
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=128&h=128&fit=crop&q=80",
    email: "teampro@example.com",
    id: "team-pro-example",
    lastActive: "Active now",
    name: "Team Pro Example",
    role: "OWNER",
  },
  {
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop&q=80",
    email: "teamfree@example.com",
    id: "team-free-example",
    lastActive: "2 days ago",
    name: "Team Free Example",
    role: "OWNER",
  },
  {
    avatarUrl:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=128&h=128&fit=crop&q=80",
    email: "teampro2@example.com",
    id: "team-pro-example-2",
    lastActive: "1 week ago",
    name: "Team Pro Example 2",
    role: "MEMBER",
  },
  {
    avatarUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=128&h=128&fit=crop&q=80",
    email: "teampro3@example.com",
    hasOptions: false,
    id: "team-pro-example-3",
    lastActive: "3 hours ago",
    name: "Team Pro Example 3",
    role: "OWNER",
  },
  {
    avatarUrl:
      "https://images.unsplash.com/photo-1504593811423-6dd665756598?w=128&h=128&fit=crop&q=80",
    email: "teampro4@example.com",
    id: "team-pro-example-4",
    lastActive: "Just now",
    name: "Team Pro Example 4",
    role: "OWNER",
  },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]?.charAt(0).toUpperCase() ?? "";
  return `${parts[0]?.charAt(0) ?? ""}${parts.at(-1)?.charAt(0) ?? ""}`.toUpperCase();
}

const ROLE_LABEL: Record<TeamRole, string> = {
  MEMBER: "Member",
  OWNER: "Owner",
};

function RoleBadge({ role }: { role: TeamRole }) {
  return (
    <Badge variant={role === "OWNER" ? "info" : "secondary"}>
      {ROLE_LABEL[role]}
    </Badge>
  );
}

function MemberActions({
  canManage = true,
  memberName,
}: {
  canManage?: boolean;
  memberName: string;
}) {
  const openProfileButton = (
    <Button aria-label={`Open ${memberName}`} size="icon-sm" variant="outline">
      <ArrowUpRightIcon aria-hidden="true" />
    </Button>
  );

  if (!canManage) {
    return openProfileButton;
  }

  return (
    <Group className="shrink-0">
      {openProfileButton}
      <GroupSeparator />
      <Menu>
        <MenuTrigger
          render={
            <Button
              aria-label={`Options for ${memberName}`}
              size="icon-sm"
              variant="outline"
            />
          }
        >
          <EllipsisIcon aria-hidden="true" />
        </MenuTrigger>
        <MenuPopup align="end">
          <MenuGroup>
            <MenuGroupLabel>Member</MenuGroupLabel>
            <MenuItem>
              <ArrowUpRightIcon aria-hidden="true" />
              View profile
            </MenuItem>
            <MenuItem>
              <UserPlusIcon aria-hidden="true" />
              Copy invite link
            </MenuItem>
          </MenuGroup>
          <MenuSeparator />
          <MenuGroup>
            <MenuGroupLabel>Permissions</MenuGroupLabel>
            <MenuItem>Change role</MenuItem>
            <MenuItem variant="destructive">Remove from team</MenuItem>
          </MenuGroup>
        </MenuPopup>
      </Menu>
    </Group>
  );
}

function getColumns({
  showRoleColumn,
  showLastActiveColumn,
}: {
  showRoleColumn: boolean;
  showLastActiveColumn: boolean;
}): ColumnDef<TeamMember>[] {
  const cols: ColumnDef<TeamMember>[] = [
    {
      cell: ({ row }) => (
        <Label className="before:absolute before:inset-0">
          <Checkbox
            aria-label={`Select ${row.original.name}`}
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
          />
          <span className="sr-only">{`Select ${row.original.name}`}</span>
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
      id: "select",
      size: 28,
    },
    {
      accessorKey: "name",
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
          <div className="min-w-0">
            <div className="truncate font-medium text-sm">
              {row.original.name}
            </div>
            <div className="truncate text-muted-foreground text-sm">
              {row.original.email}
            </div>
          </div>
        </div>
      ),
      header: "Member",
      size: 240,
    },
  ];

  if (showRoleColumn) {
    cols.push({
      accessorKey: "role",
      cell: ({ row }) => <RoleBadge role={row.original.role} />,
      header: "Role",
      size: 80,
    });
  }

  if (showLastActiveColumn) {
    cols.push({
      accessorKey: "lastActive",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {row.original.lastActive}
        </span>
      ),
      header: "Last Active",
      size: 100,
    });
  }

  cols.push({
    cell: ({ row }) => (
      <div className="flex justify-end">
        <MemberActions
          canManage={row.original.hasOptions !== false}
          memberName={row.original.name}
        />
      </div>
    ),
    enableSorting: false,
    header: () => <span className="sr-only">Actions</span>,
    id: "actions",
    size: 80,
  });

  return cols;
}

export function TeamMembersPageClient() {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [searchValue, setSearchValue] = useState("");
  const [showRoleColumn, setShowRoleColumn] = useState(true);
  const [showLastActiveColumn, setShowLastActiveColumn] = useState(true);
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
        member.email.toLowerCase().includes(query);

      return matchesRole && matchesQuery;
    });
  }, [roleFilter, searchValue]);

  const columns = useMemo(
    () =>
      getColumns({
        showLastActiveColumn,
        showRoleColumn,
      }),
    [showLastActiveColumn, showRoleColumn],
  );

  const roleFilterItem =
    ROLE_FILTER_ITEMS.find((item) => item.value === roleFilter) ??
    ROLE_FILTER_ITEMS[0]!;

  const columnToggleValue = useMemo((): ColumnToggleItem[] => {
    const selected: ColumnToggleItem[] = [];
    if (showRoleColumn) selected.push(COLUMN_TOGGLE_ITEMS[0]!);
    if (showLastActiveColumn) selected.push(COLUMN_TOGGLE_ITEMS[1]!);
    return selected;
  }, [showLastActiveColumn, showRoleColumn]);

  useEffect(() => {
    setSorting((previous) => {
      let next = previous;
      if (!showRoleColumn) {
        next = next.filter((s) => s.id !== "role");
      }
      if (!showLastActiveColumn) {
        next = next.filter((s) => s.id !== "lastActive");
      }
      return next.length > 0 ? next : [{ desc: false, id: "name" }];
    });
  }, [showLastActiveColumn, showRoleColumn]);

  const table = useReactTable({
    columns,
    data: filteredMembers,
    enableRowSelection: true,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    state: {
      rowSelection,
      sorting,
    },
  });

  return (
    <>
      <AppHeader>
        <AppHeaderContent title="Team members">
          <AppHeaderDescription>
            Users that are in the group
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
                const next = items ?? [];
                setShowRoleColumn(next.some((i) => i.value === "role"));
                setShowLastActiveColumn(
                  next.some((i) => i.value === "lastActive"),
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
                  <ComboboxGroup items={COLUMN_TOGGLE_ITEMS}>
                    <ComboboxGroupLabel>Toggle columns</ComboboxGroupLabel>
                    <ComboboxCollection>
                      {(item: ColumnToggleItem) => (
                        <ComboboxItem key={item.value} value={item}>
                          {item.label}
                        </ComboboxItem>
                      )}
                    </ComboboxCollection>
                  </ComboboxGroup>
                </ComboboxList>
                <div className="border-t p-2">
                  <Button
                    className="w-full"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowRoleColumn(true);
                      setShowLastActiveColumn(true);
                    }}
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

        <CardFrame className="w-full">
          <Table variant="boxed" className="table-fixed">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const columnSize = header.column.getSize();

                    return (
                      <TableHead
                        className={
                          header.column.id === "name" ? "sm:w-auto!" : undefined
                        }
                        key={header.id}
                        style={
                          columnSize ? { width: `${columnSize}px` } : undefined
                        }
                      >
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                          <div
                            className="flex h-full cursor-pointer select-none items-center justify-between gap-2"
                            onClick={header.column.getToggleSortingHandler()}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                header.column.getToggleSortingHandler()?.(
                                  event,
                                );
                              }
                            }}
                            role="button"
                            tabIndex={0}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
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
                          flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    className="relative"
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    key={row.id}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
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
        </CardFrame>
      </div>
    </>
  );
}
