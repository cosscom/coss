"use client";

import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { Frame, FrameFooter, FramePanel } from "@coss/ui/components/frame";
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@coss/ui/components/pagination";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@coss/ui/components/select";
import { Separator } from "@coss/ui/components/separator";
import { TooltipProvider } from "@coss/ui/components/tooltip";
import {
  CalendarClockIcon,
  CalendarIcon,
  EllipsisIcon,
  EyeOffIcon,
  FilterIcon,
  FlagIcon,
  InfoIcon,
  MapPinIcon,
  PlayCircleIcon,
  UserPlusIcon,
  VideoIcon,
  XIcon,
} from "lucide-react";
import { Fragment } from "react";
import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app-header";

const pastBookings = [
  {
    date: "25 November 2025",
    id: 1,
    meetingLink: "Join Cal Video",
    participants: "Keith Williams and Pasquale Vitiello",
    rescheduled: true,
    time: "2:40pm - 3:00pm",
    title: "Engineering Chat between Keith Williams and Pasquale Vitiello",
  },
  {
    date: "7 November 2025",
    id: 2,
    meetingLink: "Join Cal Video",
    participants: "Carina, Jonathan Djalo and Pasquale Vitiello",
    time: "11:30am - 12:00pm",
    title: "Platform onboarding roadmap",
  },
  {
    date: "6 November 2025",
    id: 3,
    meetingLink: "Join Cal Video",
    participants: "Keith Williams and Pasquale Vitiello",
    time: "3:00pm - 3:20pm",
    title: "Engineering Chat between Keith Williams and Pasquale Vitiello",
  },
  {
    date: "3 November 2025",
    id: 4,
    meetingLink: "Join Google Meet",
    participants: "Susan Moeller and Pasquale Vitiello",
    time: "3:00pm - 3:30pm",
    title: "30 Min Meeting between Susan Moeller and Pasquale Vitiello",
  },
  {
    date: "13 October 2025",
    id: 5,
    meetingLink: "Join Google Meet",
    participants: "You and David Borenius",
    rescheduled: true,
    time: "3:30pm - 4:00pm",
    title: "30 Min Meeting between Pasquale Vitiello and David Borenius",
  },
  {
    date: "10 October 2025",
    id: 6,
    meetingLink: "Join Google Meet",
    participants: "Peer Richelsen, Keith Williams and Pasquale Vitiello",
    time: "5:00pm - 5:30pm",
    title: "@coss/ui migration",
  },
];

export default function Page() {
  return (
    <TooltipProvider delay={150} timeout={0}>
      <AppHeader>
        <AppHeaderContent title="Past Bookings">
          <AppHeaderDescription>
            View your past completed bookings.
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>

      {/* Filters */}
      <div className="mb-4 flex gap-2">
        <Button variant="outline">
          <FilterIcon />
          Filter
        </Button>
        <Button variant="outline">
          <CalendarIcon />
          Saved
        </Button>
      </div>

      {/* Bookings List */}
      <Frame>
        <FramePanel className="p-0">
          {pastBookings.map((booking, index) => {
            const isLast = index === pastBookings.length - 1;
            return (
              <Fragment key={booking.id}>
                <div className="relative p-5 transition-colors first:rounded-t-[calc(var(--radius-xl)-1px)] last:rounded-b-[calc(var(--radius-xl)-1px)] has-[a:hover]:bg-[color-mix(in_srgb,var(--color-background),var(--color-black)_2%)] dark:has-[a:hover]:bg-[color-mix(in_srgb,var(--color-background),var(--color-white)_2%)]">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 flex-1 gap-4">
                      {/* Date/Time Column */}
                      <div className="flex w-32 shrink-0 flex-col items-start gap-1 max-md:hidden">
                        <p className="font-medium text-sm">{booking.date}</p>
                        <p className="text-muted-foreground text-xs">
                          {booking.time}
                        </p>
                        <a className="mt-1 inline-flex items-center gap-1 text-xs hover:underline">
                          <VideoIcon className="size-3" />
                          {booking.meetingLink}
                        </a>
                      </div>

                      {/* Content Column */}
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex items-start gap-2">
                          <h2 className="font-medium text-sm">
                            <a
                              className="before:absolute before:inset-0"
                              href="#"
                            >
                              {booking.title}
                            </a>
                          </h2>
                          {booking.rescheduled && (
                            <div className="inline-flex h-lh items-center text-sm">
                              <Badge
                                className="pointer-events-none"
                                size="sm"
                                variant="warning"
                              >
                                Rescheduled
                              </Badge>
                            </div>
                          )}
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {booking.participants}
                        </p>

                        {/* Mobile: Date/Time */}
                        <div className="mt-2 flex flex-col gap-0.5 md:hidden">
                          <p className="font-medium text-xs">{booking.date}</p>
                          <p className="text-muted-foreground text-xs">
                            {booking.time}
                          </p>
                          <a
                            className="mt-1 inline-flex items-center gap-1 text-xs hover:underline"
                            href="#"
                          >
                            <VideoIcon className="size-3" />
                            {booking.meetingLink}
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Actions Menu */}
                    <div className="relative flex items-center">
                      <Menu>
                        <MenuTrigger
                          render={
                            <Button
                              aria-label="More options"
                              size="icon"
                              variant="ghost"
                            >
                              <EllipsisIcon />
                            </Button>
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
                    </div>
                  </div>
                </div>
                {!isLast && <Separator />}
              </Fragment>
            );
          })}
        </FramePanel>

        {/* Pagination Footer */}
        <FrameFooter>
          <div className="flex items-center justify-between gap-4">
            {/* Rows per page */}
            <div className="flex items-center gap-2">
              <Select value={10}>
                <SelectTrigger
                  aria-label="Rows per page"
                  className="w-fit min-w-none"
                  size="sm"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  <SelectItem value={10}>10</SelectItem>
                  <SelectItem value={20}>20</SelectItem>
                  <SelectItem value={50}>50</SelectItem>
                </SelectPopup>
              </Select>
              <p className="text-muted-foreground text-sm">rows per page</p>
            </div>

            {/* Page info and navigation */}
            <div className="flex items-center gap-4">
              <p className="whitespace-nowrap text-muted-foreground text-sm">
                1-10 of 16
              </p>
              <Pagination>
                <PaginationContent className="gap-2">
                  <PaginationItem>
                    <PaginationPrevious
                      render={<Button disabled size="sm" variant="outline" />}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      render={<Button size="sm" variant="outline" />}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </FrameFooter>
      </Frame>
    </TooltipProvider>
  );
}
