"use client";

import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from "@coss/ui/components/menu";
import { FunnelPlusIcon } from "lucide-react";

const filterOptions = [
  { label: "Event Type", value: "event-type" },
  { label: "Team", value: "team" },
  { label: "Member", value: "member" },
  { label: "Attendees Name", value: "attendees-name" },
  { label: "Attendee Email", value: "attendee-email" },
  { label: "Date Range", value: "date-range" },
  { label: "Booking UID", value: "booking-uid" },
];

function BookingsFilters() {
  return (
    <Menu>
      <MenuTrigger
        render={
          <Button variant="outline">
            <FunnelPlusIcon />
            Add Filter
            <Badge className="-me-1" variant="outline">
              1
            </Badge>
          </Button>
        }
      />
      <MenuPopup>
        {filterOptions.map((item) => (
          <MenuItem closeOnClick key={item.value}>
            {item.label}
          </MenuItem>
        ))}
      </MenuPopup>
    </Menu>
  );
}

export { BookingsFilters };
