"use client";

import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from "@coss/ui/components/menu";
import { ListFilterIcon, PlusIcon } from "lucide-react";
import type * as React from "react";
import type { FilterField } from "./filter-chip-types";

export type FilterAddMenuVariant = "button" | "icon";

export function FilterAddMenu({
  activeFilterIds,
  fields,
  hasFilters = false,
  onSelectField,
  variant = "button",
}: {
  activeFilterIds: string[];
  fields: FilterField[];
  hasFilters?: boolean;
  onSelectField: (fieldId: string) => void;
  variant?: FilterAddMenuVariant;
}): React.ReactElement | null {
  const available = fields.filter((f) => !activeFilterIds.includes(f.id));

  if (available.length === 0 && hasFilters) {
    return null;
  }

  const menuPopup = (
    <MenuPopup align="start">
      <MenuGroup>
        <MenuGroupLabel>Filter by</MenuGroupLabel>
        {available.map((field) => (
          <MenuItem
            key={field.id}
            onClick={(): void => onSelectField(field.id)}
          >
            {field.label}
          </MenuItem>
        ))}
      </MenuGroup>
    </MenuPopup>
  );

  if (variant === "icon") {
    return (
      <Menu>
        <MenuTrigger
          render={
            <Button aria-label="Add filter" size="icon-xs" variant="ghost" />
          }
        >
          <PlusIcon />
        </MenuTrigger>
        {menuPopup}
      </Menu>
    );
  }

  return (
    <Menu>
      <MenuTrigger
        render={
          <Button aria-label="Add Filter" size="sm" variant="outline">
            <ListFilterIcon />
            Filter
            {activeFilterIds.length > 0 && (
              <Badge variant="secondary" className="-me-1">
                {activeFilterIds.length}
              </Badge>
            )}
          </Button>
        }
      />
      {menuPopup}
    </Menu>
  );
}
