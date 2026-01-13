"use client";

import { Button } from "@coss/ui/components/button";
import { Group, GroupSeparator } from "@coss/ui/components/group";
import {
  Menu,
  MenuCheckboxItem,
  MenuGroup,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@coss/ui/components/menu";
import { Switch } from "@coss/ui/components/switch";
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import { EllipsisIcon, EyeIcon, Link2Icon } from "lucide-react";

interface EventTypeActionsProps {
  isHidden: boolean;
  onHiddenChange: (hidden: boolean) => void;
  tooltipHandle?: Parameters<typeof TooltipTrigger>[0]["handle"];
}

export function EventTypeActions({
  isHidden,
  onHiddenChange,
  tooltipHandle,
}: EventTypeActionsProps) {
  return (
    <div className="relative flex items-center gap-3">
      <div className="flex items-center gap-4 max-md:hidden">
        <Tooltip>
          <TooltipTrigger
            render={
              <Switch
                checked={!isHidden}
                onCheckedChange={(checked) => onHiddenChange(!checked)}
              />
            }
          />
          <TooltipPopup sideOffset={11}>
            {isHidden ? "Show on profile" : "Hide from profile"}
          </TooltipPopup>
        </Tooltip>

        <Group>
          <TooltipTrigger
            handle={tooltipHandle}
            payload={() => "Preview"}
            render={
              <Button aria-label="Preview" size="icon" variant="outline">
                <EyeIcon />
              </Button>
            }
          />
          <GroupSeparator />
          <TooltipTrigger
            handle={tooltipHandle}
            payload={() => "Copy link"}
            render={
              <Button aria-label="Copy link" size="icon" variant="outline">
                <Link2Icon />
                <span className="sr-only">Copy link</span>
              </Button>
            }
          />
          <GroupSeparator />
          <Menu>
            <MenuTrigger
              render={
                <TooltipTrigger
                  handle={tooltipHandle}
                  payload={() => "More options"}
                  render={
                    <Button
                      aria-label="More options"
                      size="icon"
                      variant="outline"
                    >
                      <EllipsisIcon />
                    </Button>
                  }
                />
              }
            />
            <MenuPopup align="end">
              <MenuItem>Edit</MenuItem>
              <MenuItem>Duplicate</MenuItem>
              <MenuItem>Embed</MenuItem>
              <MenuSeparator />
              <MenuItem variant="destructive">Delete</MenuItem>
            </MenuPopup>
          </Menu>
        </Group>
      </div>

      <Menu>
        <MenuTrigger
          className="md:hidden"
          render={
            <Button aria-label="More options" size="icon" variant="outline">
              <EllipsisIcon />
            </Button>
          }
        />
        <MenuPopup align="end">
          <MenuItem>Preview</MenuItem>
          <MenuItem>Copy link to event</MenuItem>
          <MenuItem>Share</MenuItem>
          <MenuItem>Edit</MenuItem>
          <MenuItem>Duplicate</MenuItem>
          <MenuSeparator />
          <MenuGroup>
            <MenuCheckboxItem
              checked={!isHidden}
              onCheckedChange={(checked) => onHiddenChange(!checked)}
              variant="switch"
            >
              Show on profile
            </MenuCheckboxItem>
          </MenuGroup>
          <MenuSeparator />
          <MenuItem variant="destructive">Delete</MenuItem>
        </MenuPopup>
      </Menu>
    </div>
  );
}
