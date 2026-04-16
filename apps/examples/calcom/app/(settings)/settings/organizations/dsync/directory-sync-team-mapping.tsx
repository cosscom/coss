"use client";

import { Button } from "@coss/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import { PlusIcon, XIcon } from "lucide-react";
import { useCallback, useState } from "react";

export interface TeamDirectoryRow {
  id: string;
  teamName: string;
  groupNames: string[];
}

interface DirectorySyncTeamMappingProps {
  initialRows: TeamDirectoryRow[];
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

  const addGroup = useCallback((teamId: string) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== teamId) {
          return row;
        }
        const nextIndex = row.groupNames.length + 1;
        const label = `Group ${nextIndex}`;
        if (row.groupNames.includes(label)) {
          return row;
        }
        return { ...row, groupNames: [...row.groupNames, label] };
      }),
    );
  }, []);

  return (
    <Table className="w-full" variant="card">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[min(12rem,36%)]">Team</TableHead>
          <TableHead>Group name</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="align-top font-medium text-foreground">
              {row.teamName}
            </TableCell>
            <TableCell className="align-top">
              <div className="flex flex-wrap items-center gap-2 py-0.5">
                {row.groupNames.map((name) => (
                  <span
                    className="inline-flex max-w-full items-center gap-0.5 rounded-md border bg-muted/40 ps-2 text-foreground text-sm"
                    key={`${row.id}-${name}`}
                  >
                    <span className="truncate py-1 pe-0.5">{name}</span>
                    <Button
                      aria-label={`Remove group ${name}`}
                      className="shrink-0 rounded-s-none"
                      onClick={() => removeGroup(row.id, name)}
                      size="icon-xs"
                      type="button"
                      variant="ghost"
                    >
                      <XIcon aria-hidden="true" />
                    </Button>
                  </span>
                ))}
                <Button
                  className="rounded-full"
                  onClick={() => addGroup(row.id)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <PlusIcon aria-hidden="true" />
                  Add group name
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
