"use client";

import { Button } from "@coss/ui/components/button";
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
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import {
  CalendarClockIcon,
  EllipsisIcon,
  EyeOffIcon,
  FlagIcon,
  InfoIcon,
  MapPinIcon,
  PlayCircleIcon,
  UserPlusIcon,
  XIcon,
} from "lucide-react";

export function BookingActions() {
  return (
    <Menu>
      <MenuTrigger
        render={
          <Tooltip>
            <TooltipTrigger
              render={
                <Button aria-label="More options" size="icon" variant="outline">
                  <EllipsisIcon />
                </Button>
              }
            />
            <TooltipPopup>More options</TooltipPopup>
          </Tooltip>
        }
      />
      <MenuPopup align="end">
        <MenuGroup>
          <MenuGroupLabel>Edit event</MenuGroupLabel>
          <MenuItem>
            <CalendarClockIcon />
            Reschedule booking
          </MenuItem>
          <MenuItem disabled>
            <CalendarClockIcon />
            Request reschedule
          </MenuItem>
          <MenuItem>
            <MapPinIcon />
            Edit location
          </MenuItem>
          <MenuItem>
            <UserPlusIcon />
            Add guests
          </MenuItem>
        </MenuGroup>
        <MenuSeparator />
        <MenuGroup>
          <MenuGroupLabel>After event</MenuGroupLabel>
          <MenuItem disabled>
            <PlayCircleIcon />
            View recordings
          </MenuItem>
          <MenuItem>
            <InfoIcon />
            View Session Details
          </MenuItem>
          <MenuItem>
            <EyeOffIcon />
            Mark as no-show
          </MenuItem>
        </MenuGroup>
        <MenuSeparator />
        <MenuGroup>
          <MenuItem variant="destructive">
            <FlagIcon />
            Report booking
          </MenuItem>
        </MenuGroup>
        <MenuSeparator />
        <MenuGroup>
          <MenuItem disabled variant="destructive">
            <XIcon />
            Cancel event
          </MenuItem>
        </MenuGroup>
      </MenuPopup>
    </Menu>
  );
}
