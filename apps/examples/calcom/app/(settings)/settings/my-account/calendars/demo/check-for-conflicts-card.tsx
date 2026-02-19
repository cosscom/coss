"use client";

import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameAction,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { Field, FieldLabel } from "@coss/ui/components/field";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from "@coss/ui/components/menu";
import { Switch } from "@coss/ui/components/switch";
import { EllipsisIcon, PlusIcon, Trash2Icon } from "lucide-react";
import Image from "next/image";

const GOOGLE_CALENDAR_ICON =
  "https://app.cal.com/app-store/googlecalendar/icon.svg";

const CONFLICT_INSTRUCTION =
  "Toggle the calendars you want to check for conflicts to prevent double bookings.";

const calendarAccounts = [
  {
    calendars: [
      { label: "example@cal.com", value: "example" },
      { label: "Team", value: "team" },
    ],
    email: "example@cal.com",
    showMenu: false,
  },
  {
    calendars: [{ label: "example2@gmail.com", value: "gmail" }],
    email: "example2@gmail.com",
    showMenu: true,
  },
];

function CalendarAccountBlock({
  email,
  calendars,
  showMenu,
}: {
  email: string;
  calendars: { label: string; value: string }[];
  showMenu: boolean;
}) {
  return (
    <Card>
      <CardPanel className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image
              alt="Google Calendar"
              className="size-10 shrink-0"
              height={40}
              src={GOOGLE_CALENDAR_ICON}
              width={40}
            />
            <div>
              <p className="font-medium text-sm">Google Calendar</p>
              <p className="text-muted-foreground text-sm">{email}</p>
            </div>
          </div>
          {showMenu && (
            <Menu>
              <MenuTrigger
                render={
                  <Button
                    aria-label="Calendar options"
                    size="icon"
                    variant="outline"
                  />
                }
              >
                <EllipsisIcon />
              </MenuTrigger>
              <MenuPopup align="end">
                <MenuItem variant="destructive">
                  <Trash2Icon />
                  Remove app
                </MenuItem>
              </MenuPopup>
            </Menu>
          )}
        </div>
        <p className="text-muted-foreground text-sm">{CONFLICT_INSTRUCTION}</p>
        <div className="flex flex-col gap-3">
          {calendars.map((calendar) => (
            <Field key={calendar.value}>
              <FieldLabel>
                <Switch />
                {calendar.label}
              </FieldLabel>
            </Field>
          ))}
        </div>
      </CardPanel>
    </Card>
  );
}

export function CheckForConflictsCard() {
  return (
    <CardFrame>
      <CardFrameHeader>
        <CardFrameTitle>Check for conflicts</CardFrameTitle>
        <CardFrameDescription>
          Select which calendars you want to check for conflicts to prevent
          double bookings.
        </CardFrameDescription>
        <CardFrameAction>
          <Button variant="outline">
            <PlusIcon />
            Add
          </Button>
        </CardFrameAction>
      </CardFrameHeader>

      <Card>
        <CardPanel>
          <div className="flex flex-col gap-4">
            {calendarAccounts.map((account) => (
              <CalendarAccountBlock
                calendars={account.calendars}
                email={account.email}
                key={account.email}
                showMenu={account.showMenu}
              />
            ))}
          </div>
        </CardPanel>
      </Card>
    </CardFrame>
  );
}
