"use client";

import { Button } from "@coss/ui/components/button";
import {
  Drawer,
  DrawerClose,
  DrawerMenu,
  DrawerMenuCheckboxItem,
  DrawerMenuGroup,
  DrawerMenuItem,
  DrawerMenuSeparator,
  DrawerPanel,
  DrawerPopup,
  DrawerTrigger,
} from "@coss/ui/components/drawer";
import { Group, GroupSeparator } from "@coss/ui/components/group";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@coss/ui/components/menu";
import { Skeleton } from "@coss/ui/components/skeleton";
import { Switch } from "@coss/ui/components/switch";
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import {
  CodeIcon,
  CopyIcon,
  EllipsisIcon,
  EyeIcon,
  Link2Icon,
  PencilIcon,
  Share2Icon,
  TrashIcon,
} from "lucide-react";

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
    <>
      <div className="flex items-center gap-4 max-md:hidden">
        <Tooltip>
          <TooltipTrigger
            render={
              <Switch
                checked={!isHidden}
                className="relative"
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
              <MenuItem>
                <PencilIcon />
                Edit
              </MenuItem>
              <MenuItem>
                <CopyIcon />
                Duplicate
              </MenuItem>
              <MenuItem>
                <CodeIcon />
                Embed
              </MenuItem>
              <MenuSeparator />
              <MenuItem variant="destructive">
                <TrashIcon />
                Delete
              </MenuItem>
            </MenuPopup>
          </Menu>
        </Group>
      </div>

      <div className="md:hidden">
        <Drawer>
          <DrawerTrigger
            render={
              <Button aria-label="More options" size="icon" variant="outline" />
            }
          >
            <EllipsisIcon aria-hidden />
          </DrawerTrigger>
          <DrawerPopup showBar>
            <DrawerPanel>
              <DrawerMenu>
                <DrawerClose render={<DrawerMenuItem />}>
                  <EyeIcon aria-hidden />
                  Preview
                </DrawerClose>
                <DrawerClose render={<DrawerMenuItem />}>
                  <Link2Icon aria-hidden />
                  Copy link to event
                </DrawerClose>
                <DrawerClose render={<DrawerMenuItem />}>
                  <Share2Icon aria-hidden />
                  Share
                </DrawerClose>
                <DrawerClose render={<DrawerMenuItem />}>
                  <PencilIcon aria-hidden />
                  Edit
                </DrawerClose>
                <DrawerClose render={<DrawerMenuItem />}>
                  <CopyIcon aria-hidden />
                  Duplicate
                </DrawerClose>
                <DrawerClose render={<DrawerMenuItem />}>
                  <CodeIcon aria-hidden />
                  Embed
                </DrawerClose>
                <DrawerMenuSeparator />
                <DrawerMenuGroup>
                  <DrawerMenuCheckboxItem
                    checked={!isHidden}
                    onCheckedChange={(checked) => onHiddenChange(!checked)}
                    variant="switch"
                  >
                    Show on profile
                  </DrawerMenuCheckboxItem>
                </DrawerMenuGroup>
                <DrawerMenuSeparator />
                <DrawerClose render={<DrawerMenuItem variant="destructive" />}>
                  <TrashIcon aria-hidden />
                  Delete
                </DrawerClose>
              </DrawerMenu>
            </DrawerPanel>
          </DrawerPopup>
        </Drawer>
      </div>
    </>
  );
}

export function EventTypeActionsSkeleton() {
  return (
    <div className="flex items-center gap-4">
      <Skeleton className="h-4.5 w-7.5 rounded-full max-md:hidden" />
      <Skeleton className="size-9 rounded-lg sm:h-8 sm:w-24.5" />
    </div>
  );
}
