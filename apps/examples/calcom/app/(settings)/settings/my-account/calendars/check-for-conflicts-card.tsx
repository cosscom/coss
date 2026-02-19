"use client";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@coss/ui/components/alert-dialog";
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
import { useState } from "react";

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

type CalendarAccount = (typeof calendarAccounts)[number];

function CalendarAccountBlock({
  account,
  onRemoveClick,
}: {
  account: CalendarAccount;
  onRemoveClick: (account: CalendarAccount) => void;
}) {
  const { email, calendars, showMenu } = account;
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
                <MenuItem
                  onClick={() => onRemoveClick(account)}
                  variant="destructive"
                >
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
  const [accounts, setAccounts] = useState(calendarAccounts);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [accountToRemove, setAccountToRemove] =
    useState<CalendarAccount | null>(null);

  function handleRemoveClick(account: CalendarAccount) {
    setAccountToRemove(account);
    setRemoveDialogOpen(true);
  }

  function handleRemoveConfirm() {
    if (!accountToRemove) return;
    setAccounts((prev) =>
      prev.filter((a) => a.email !== accountToRemove.email),
    );
    setRemoveDialogOpen(false);
    setAccountToRemove(null);
  }

  function handleRemoveDialogOpenChange(open: boolean) {
    setRemoveDialogOpen(open);
    if (!open) setAccountToRemove(null);
  }

  return (
    <>
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
              {accounts.map((account) => (
                <CalendarAccountBlock
                  account={account}
                  key={account.email}
                  onRemoveClick={handleRemoveClick}
                />
              ))}
            </div>
          </CardPanel>
        </Card>
      </CardFrame>

      <AlertDialog
        onOpenChange={handleRemoveDialogOpenChange}
        open={removeDialogOpen}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove app</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this app?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>
              Cancel
            </AlertDialogClose>
            <AlertDialogClose
              onClick={handleRemoveConfirm}
              render={<Button variant="destructive">Remove app</Button>}
            />
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
}
