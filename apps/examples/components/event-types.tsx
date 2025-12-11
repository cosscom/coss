"use client";

import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { Card, CardPanel } from "@coss/ui/components/card";
import { Field, FieldLabel } from "@coss/ui/components/field";
import { Group, GroupSeparator } from "@coss/ui/components/group";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@coss/ui/components/input-group";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@coss/ui/components/menu";
import { Switch } from "@coss/ui/components/switch";
import {
  Tooltip,
  TooltipCreateHandle,
  TooltipPopup,
  TooltipProvider,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import {
  ClockIcon,
  EllipsisIcon,
  EyeIcon,
  Link2Icon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { useState } from "react";

const tooltipHandle = TooltipCreateHandle<React.ComponentType>();

const eventTypes = [
  {
    duration: "15m",
    enabled: true,
    hidden: false,
    id: 1,
    path: "/pasquale/15min",
    title: "15 Min Meeting",
  },
  {
    duration: "30m",
    enabled: true,
    hidden: false,
    id: 2,
    path: "/pasquale/30min",
    title: "30 Min Meeting",
  },
  {
    duration: "15m",
    enabled: false,
    hidden: true,
    id: 3,
    path: "/pasquale/secret",
    title: "Secret Meeting",
  },
  {
    duration: "15m",
    enabled: false,
    hidden: true,
    id: 4,
    path: "/pasquale/secret",
    title: "Secret Meeting",
  },
  {
    duration: "15m",
    enabled: false,
    hidden: true,
    id: 5,
    path: "/pasquale/secret",
    title: "Secret Meeting",
  },
  {
    duration: "15m",
    enabled: false,
    hidden: true,
    id: 6,
    path: "/pasquale/secret",
    title: "Secret Meeting",
  },
  {
    duration: "15m",
    enabled: false,
    hidden: true,
    id: 7,
    path: "/pasquale/secret",
    title: "Secret Meeting",
  },
  {
    duration: "15m",
    enabled: false,
    hidden: true,
    id: 8,
    path: "/pasquale/secret",
    title: "Secret Meeting",
  },
  {
    duration: "15m",
    enabled: false,
    hidden: true,
    id: 9,
    path: "/pasquale/secret",
    title: "Secret Meeting",
  },
  {
    duration: "15m",
    enabled: false,
    hidden: true,
    id: 10,
    path: "/pasquale/secret",
    title: "Secret Meeting",
  },
];

export function EventTypes() {
  const [hiddenStates, setHiddenStates] = useState<Record<number, boolean>>(
    Object.fromEntries(eventTypes.map((et) => [et.id, et.hidden])),
  );

  const handleHiddenToggle = (id: number, checked: boolean) => {
    setHiddenStates((prev) => ({
      ...prev,
      [id]: checked,
    }));
  };

  return (
    <TooltipProvider delay={150} timeout={0}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-xl leading-none">Event Types</h1>
          <p className="text-muted-foreground text-sm max-md:hidden">
            Create events to share for people to book on your calendar.
          </p>
        </div>
        <Button className="max-md:hidden">
          <PlusIcon className="-ms-1 opacity-72" />
          New
        </Button>
      </div>

      {/* Search */}
      <div className="mt-6">
        <InputGroup className="md:max-w-64">
          <InputGroupInput
            aria-label="Search"
            placeholder="Search…"
            type="search"
          />
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
        </InputGroup>
      </div>

      <div className="mt-4 *:not-first:rounded-t-none *:not-last:rounded-b-none *:not-last:border-b-0 *:not-last:before:hidden *:not-first:before:rounded-t-none *:not-last:before:rounded-b-none dark:*:not-first:before:hidden dark:*:first:before:block">
        {eventTypes.map((eventType) => {
          const isHidden = hiddenStates[eventType.id];
          return (
            <Card
              className="py-5 transition-colors has-[a:hover]:bg-[color-mix(in_srgb,var(--color-card),var(--color-black)_2%)] dark:has-[a:hover]:bg-[color-mix(in_srgb,var(--color-card),var(--color-white)_2%)]"
              key={eventType.id}
            >
              <CardPanel className="px-5">
                <div className="flex items-center justify-between gap-2">
                  {/* Content */}
                  <div className="flex flex-col gap-0.5">
                    <div className="flex flex-col items-start gap-1 md:flex-row md:items-center md:gap-2">
                      <h2 className="font-semibold text-sm">
                        <a
                          className="before:absolute before:inset-0"
                          href={eventType.path}
                        >
                          {eventType.title}
                        </a>
                      </h2>
                      <Badge className="pointer-events-none" variant="outline">
                        <ClockIcon className="opacity-72" />
                        {eventType.duration}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs max-md:hidden">
                      {eventType.path}
                    </p>
                  </div>
                  {/* Actions */}
                  <div className="-m-6 relative flex items-center gap-4 p-6">
                    <div className="flex items-center gap-2">
                      {isHidden ? (
                        <Badge
                          className="pointer-events-none"
                          size="sm"
                          variant="outline"
                        >
                          Hidden
                        </Badge>
                      ) : null}
                      <Tooltip>
                        <TooltipTrigger
                          className="max-md:hidden"
                          render={
                            <Switch
                              checked={!isHidden}
                              onCheckedChange={(checked) =>
                                handleHiddenToggle(eventType.id, !checked)
                              }
                            />
                          }
                        />
                        <TooltipPopup sideOffset={11}>
                          {isHidden ? "Show on profile" : "Hide from profile"}
                        </TooltipPopup>
                      </Tooltip>
                    </div>
                    {/* Desktop: Group of buttons */}
                    <Group className="max-md:hidden">
                      <TooltipTrigger
                        handle={tooltipHandle}
                        payload={() => "Preview"}
                        render={
                          <Button
                            aria-label="Preview"
                            size="icon"
                            variant="outline"
                          >
                            <EyeIcon />
                          </Button>
                        }
                      />
                      <GroupSeparator />
                      <TooltipTrigger
                        handle={tooltipHandle}
                        payload={() => "Copy link"}
                        render={
                          <Button
                            aria-label="Copy link"
                            size="icon"
                            variant="outline"
                          >
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
                    {/* Mobile: Single menu button with all actions */}
                    <Menu>
                      <MenuTrigger
                        className="md:hidden"
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
                      <MenuPopup align="end">
                        <MenuItem>Preview</MenuItem>
                        <MenuItem>Copy link to event</MenuItem>
                        <MenuItem>Share</MenuItem>
                        <MenuItem>Edit</MenuItem>
                        <MenuItem>Duplicate</MenuItem>
                        <MenuSeparator />
                        <MenuItem variant="destructive">Delete</MenuItem>
                        <MenuSeparator />
                        <MenuItem
                          className="flex-row justify-between"
                          closeOnClick={false}
                          render={<Field render={<FieldLabel />} />}
                        >
                          {isHidden ? "Show" : "Hide"}
                          <Switch
                            checked={!isHidden}
                            onCheckedChange={(checked) => {
                              handleHiddenToggle(eventType.id, !checked);
                            }}
                          />
                        </MenuItem>
                      </MenuPopup>
                    </Menu>
                  </div>
                </div>
              </CardPanel>
            </Card>
          );
        })}
      </div>

      {/* No more results */}
      <div className="mt-6 text-center text-muted-foreground/64 text-sm">
        No more results
      </div>

      <Tooltip handle={tooltipHandle}>
        {({ payload: Payload }) => (
          <TooltipPopup>{Payload !== undefined && <Payload />}</TooltipPopup>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
