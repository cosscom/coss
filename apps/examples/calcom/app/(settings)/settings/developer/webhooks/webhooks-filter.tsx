"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@coss/ui/components/avatar";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxTrigger,
} from "@coss/ui/components/combobox";
import { Group, GroupSeparator } from "@coss/ui/components/group";
import { FilterIcon, ListFilterIcon, SearchIcon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";
import type { UserFilterOption, WebhookItem } from "./webhooks-list-content";
import { getInitials, getUniqueUsers } from "./webhooks-list-content";

interface WebhooksFilterProps {
  webhooks: WebhookItem[];
  selectedUserIds: string[];
  onSelectionChange: (selectedUserIds: string[]) => void;
}

export function WebhooksFilter({
  webhooks,
  selectedUserIds,
  onSelectionChange,
}: WebhooksFilterProps) {
  const normalized = webhooks.map((w) => ({
    ...w,
    events: Array.isArray(w.events) ? w.events : [],
  }));
  const uniqueUsers = useMemo(() => getUniqueUsers(normalized), [normalized]);

  const selectedUsers = useMemo(() => {
    return uniqueUsers.filter((user) => selectedUserIds.includes(user.id));
  }, [uniqueUsers, selectedUserIds]);

  const [open, setOpen] = useState(false);

  const handleValueChange = (
    value: UserFilterOption | UserFilterOption[] | null,
  ) => {
    let newSelection: UserFilterOption[];
    if (Array.isArray(value)) {
      newSelection = value;
    } else if (value) {
      newSelection = [value];
    } else {
      newSelection = [];
    }
    const userIds = newSelection.map((u) => u.id);
    onSelectionChange(userIds);
    // Keep popup open for multiple selection
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
  };

  const renderTriggerContent = () => {
    if (selectedUsers.length === 0) {
      return <ListFilterIcon />;
    }
    const firstUser = selectedUsers[0];
    const remainingCount = selectedUsers.length - 1;

    if (!firstUser) return null;

    return (
      <>
        <FilterIcon />
        <span className="truncate">{firstUser.label}</span>
        {remainingCount > 0 && (
          <Badge className="tabular-nums" variant="secondary">
            +{remainingCount}
          </Badge>
        )}
      </>
    );
  };

  const comboboxContent = (
    <Combobox
      autoHighlight
      items={uniqueUsers}
      multiple
      onOpenChange={handleOpenChange}
      onValueChange={handleValueChange}
      open={open}
      value={selectedUsers}
    >
      <ComboboxTrigger
        render={
          <Button
            size={selectedUsers.length === 0 ? "icon" : "default"}
            variant="outline"
          />
        }
      >
        {renderTriggerContent()}
      </ComboboxTrigger>
      <ComboboxPopup align="end" aria-label="Select user">
        <div className="border-b p-2">
          <ComboboxInput
            className="rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
            placeholder="Search users..."
            showTrigger={false}
            startAddon={<SearchIcon />}
          />
        </div>
        <ComboboxEmpty>No users found.</ComboboxEmpty>
        <ComboboxList>
          {(option: UserFilterOption) => (
            <ComboboxItem key={option.id} value={option}>
              <div className="flex items-center gap-2">
                <Avatar className="size-5">
                  {option.avatar ? (
                    <AvatarImage alt={option.label} src={option.avatar} />
                  ) : null}
                  <AvatarFallback className="text-[.625rem]">
                    {getInitials(option.label)}
                  </AvatarFallback>
                </Avatar>
                <span>{option.label}</span>
              </div>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxPopup>
    </Combobox>
  );

  if (selectedUserIds.length === 0) {
    return comboboxContent;
  }

  return (
    <Group>
      {comboboxContent}
      <GroupSeparator />
      <Button
        aria-label="Remove filter"
        onClick={() => onSelectionChange([])}
        size="icon"
        variant="outline"
      >
        <XIcon />
      </Button>
    </Group>
  );
}
