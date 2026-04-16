"use client";

import { Button, buttonVariants } from "@coss/ui/components/button";
import { Group, GroupSeparator, GroupText } from "@coss/ui/components/group";
import { Input } from "@coss/ui/components/input";
import {
  Popover,
  PopoverPopup,
  PopoverTrigger,
} from "@coss/ui/components/popover";
import { cn } from "@coss/ui/lib/utils";
import { PlusIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ListItem, ListItemContent } from "@/components/list-item";

export interface TeamDirectoryRow {
  id: string;
  teamName: string;
  groupNames: string[];
}

interface DirectorySyncTeamMappingProps {
  initialRows: TeamDirectoryRow[];
}

function TeamRowGroups({
  groupNames,
  onAddGroup,
  onRemoveGroup,
  teamId,
}: {
  teamId: string;
  groupNames: string[];
  onAddGroup: (teamId: string, name: string) => void;
  onRemoveGroup: (teamId: string, name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  const addDisabled = draft.trim().length === 0;

  function handleAdd(): void {
    if (addDisabled) {
      return;
    }
    const trimmed = draft.trim();
    onAddGroup(teamId, trimmed);
    setDraft("");
    setOpen(false);
  }

  function handleOpenChange(next: boolean): void {
    setOpen(next);
    if (!next) {
      setDraft("");
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {groupNames.map((name) => (
        <Group aria-label={`Directory group ${name}`} key={`${teamId}-${name}`}>
          <GroupText
            className={cn(
              buttonVariants({ size: "sm", variant: "outline" }),
              "pointer-events-none",
            )}
          >
            {name}
          </GroupText>
          <GroupSeparator />
          <Button
            aria-label={`Remove group ${name}`}
            onClick={() => onRemoveGroup(teamId, name)}
            size="icon-sm"
            type="button"
            variant="outline"
          >
            <XIcon aria-hidden="true" />
          </Button>
        </Group>
      ))}
      <Popover onOpenChange={handleOpenChange} open={open}>
        <PopoverTrigger
          render={<Button size="sm" type="button" variant="outline" />}
        >
          <PlusIcon aria-hidden="true" />
          Group name
        </PopoverTrigger>
        <PopoverPopup
          align="start"
          className="min-w-64 transition-none"
          portalProps={{
            className: "*:data-[slot=popover-positioner]:transition-none",
          }}
        >
          <div className="flex flex-col gap-2">
            <Input
              aria-label="Group name"
              className="rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Enter group name"
              ref={inputRef}
              size="sm"
              type="text"
              value={draft}
            />
            <Button
              className="rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
              disabled={addDisabled}
              onClick={handleAdd}
              size="sm"
              type="button"
              variant="outline"
            >
              Add
            </Button>
          </div>
        </PopoverPopup>
      </Popover>
    </div>
  );
}

export function DirectorySyncTeamMapping({
  initialRows,
}: DirectorySyncTeamMappingProps) {
  const [rows, setRows] = useState<TeamDirectoryRow[]>(initialRows);

  const removeGroup = useCallback((teamId: string, groupName: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === teamId
          ? {
              ...row,
              groupNames: row.groupNames.filter((g) => g !== groupName),
            }
          : row,
      ),
    );
  }, []);

  const addGroup = useCallback((teamId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    setRows((prev) =>
      prev.map((row) =>
        row.id === teamId && !row.groupNames.includes(trimmed)
          ? { ...row, groupNames: [...row.groupNames, trimmed] }
          : row,
      ),
    );
  }, []);

  return (
    <>
      {rows.map((row) => (
        <ListItem key={row.id}>
          <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row">
            <div className="flex items-center md:w-36 md:shrink-0 md:min-h-7">
              <p className="text-sm font-medium text-foreground">
                {row.teamName}
              </p>
            </div>
            <ListItemContent>
              <TeamRowGroups
                groupNames={row.groupNames}
                onAddGroup={addGroup}
                onRemoveGroup={removeGroup}
                teamId={row.id}
              />
            </ListItemContent>
          </div>
        </ListItem>
      ))}
    </>
  );
}
