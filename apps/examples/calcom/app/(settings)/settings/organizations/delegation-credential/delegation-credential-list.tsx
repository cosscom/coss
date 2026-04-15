"use client";

import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import {
  Menu,
  MenuCheckboxItem,
  MenuGroup,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@coss/ui/components/menu";
import {
  Popover,
  PopoverPopup,
  PopoverTrigger,
} from "@coss/ui/components/popover";
import { Switch } from "@coss/ui/components/switch";
import { EllipsisIcon, InfoIcon, PencilIcon, TrashIcon } from "lucide-react";
import type { DelegationCredentialItem } from "./delegation-credential-types";
import {
  ListItem,
  ListItemActions,
  ListItemBadges,
  ListItemContent,
  ListItemHeader,
  ListItemSpanningTrigger,
  ListItemTitle,
} from "@/components/list-item";

export function DelegationCredentialList({
  credentials,
  enabledById,
  onEditRequest,
  onEnabledChange,
  onRemoveRequest,
}: {
  credentials: DelegationCredentialItem[];
  enabledById: Record<string, boolean>;
  onEditRequest: (item: DelegationCredentialItem) => void;
  onEnabledChange: (id: string, checked: boolean) => void;
  onRemoveRequest: (item: DelegationCredentialItem) => void;
}) {
  return (
    <>
      {credentials.map((credential) => {
        return (
          <ListItem key={credential.id}>
            <ListItemContent>
              <ListItemHeader>
                <div className="flex flex-col gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <ListItemTitle className="min-w-0 truncate font-semibold sm:text-sm">
                      <ListItemSpanningTrigger
                        render={
                          <button
                            type="button"
                            onClick={() => onEditRequest(credential)}
                          />
                        }
                      >
                        {credential.subjectId}
                      </ListItemSpanningTrigger>
                    </ListItemTitle>
                    <Popover>
                      <PopoverTrigger
                        className="relative"
                        aria-label="About Client Id"
                        closeDelay={100}
                        delay={0}
                        openOnHover
                      >
                        <InfoIcon className="size-3.5 text-muted-foreground" />
                      </PopoverTrigger>
                      <PopoverPopup
                        className="max-w-52 text-center"
                        side="top"
                        tooltipStyle
                      >
                        <p>
                          Add this Client Id in Google Workspace with the scope
                          below
                        </p>
                      </PopoverPopup>
                    </Popover>
                  </div>
                  <p className="line-clamp-2 break-all text-muted-foreground text-sm">
                    {credential.scopeUrl}
                  </p>
                  <ListItemBadges>
                    <Badge className="pointer-events-none" variant="warning">
                      {credential.platformLabel}
                    </Badge>
                    <Badge className="pointer-events-none" variant="outline">
                      {credential.domain}
                    </Badge>
                  </ListItemBadges>
                </div>
              </ListItemHeader>
            </ListItemContent>

            <ListItemActions className="max-md:hidden">
              <Switch
                checked={enabledById[credential.id] ?? true}
                className="relative"
                onCheckedChange={(checked) =>
                  onEnabledChange(credential.id, checked)
                }
              />
              <Menu>
                <MenuTrigger
                  render={
                    <Button
                      aria-label="Delegation credential options"
                      size="icon"
                      type="button"
                      variant="outline"
                    />
                  }
                >
                  <EllipsisIcon aria-hidden="true" />
                </MenuTrigger>
                <MenuPopup align="end" alignOffset={-4} sideOffset={8}>
                  <MenuItem onClick={() => onEditRequest(credential)}>
                    <PencilIcon aria-hidden="true" />
                    Edit
                  </MenuItem>
                  <MenuItem
                    onClick={() => onRemoveRequest(credential)}
                    variant="destructive"
                  >
                    <TrashIcon aria-hidden="true" />
                    Delete
                  </MenuItem>
                </MenuPopup>
              </Menu>
            </ListItemActions>

            <Menu>
              <MenuTrigger
                className="md:hidden"
                render={
                  <Button
                    aria-label="Delegation credential options"
                    size="icon"
                    type="button"
                    variant="outline"
                  />
                }
              >
                <EllipsisIcon aria-hidden="true" />
              </MenuTrigger>
              <MenuPopup align="end" alignOffset={-4} sideOffset={8}>
                <MenuItem onClick={() => onEditRequest(credential)}>
                  <PencilIcon aria-hidden="true" />
                  Edit
                </MenuItem>
                <MenuSeparator />
                <MenuGroup>
                  <MenuCheckboxItem
                    checked={enabledById[credential.id] ?? true}
                    onCheckedChange={(checked) =>
                      onEnabledChange(credential.id, checked)
                    }
                    variant="switch"
                  >
                    Enabled
                  </MenuCheckboxItem>
                </MenuGroup>
                <MenuSeparator />
                <MenuItem
                  onClick={() => onRemoveRequest(credential)}
                  variant="destructive"
                >
                  <TrashIcon aria-hidden="true" />
                  Delete
                </MenuItem>
              </MenuPopup>
            </Menu>
          </ListItem>
        );
      })}
    </>
  );
}
