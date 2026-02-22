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
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@coss/ui/components/empty";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from "@coss/ui/components/menu";
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import { EllipsisIcon, PencilIcon, Trash2Icon, VideoIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import {
  ListItem,
  ListItemActions,
  ListItemContent,
  ListItemDescription,
  ListItemHeader,
  ListItemTitle,
} from "@/components/list-item";

export type ConferencingApp = {
  id: string;
  name: string;
  description: string;
  logo: string;
  alt: string;
  isDefault?: boolean;
};

const initialApps: ConferencingApp[] = [
  {
    alt: "Cal Video",
    description:
      "Cal Video is the in-house web-based video conferencing platform powered by Daily.co, which is minimalistic and lightweight, but has most of the features you need.",
    id: "cal-video",
    isDefault: true,
    logo: "https://app.cal.com/app-store/dailyvideo/icon.svg",
    name: "Cal Video",
  },
  {
    alt: "Google Meet",
    description:
      "Google Meet is Google's web-based video conferencing platform, designed to compete with major conferencing platforms.",
    id: "google-meet",
    logo: "https://app.cal.com/app-store/googlevideo/logo.webp",
    name: "Google Meet",
  },
];

export function ConferencingEmpty({
  apps = initialApps,
  onAppsChange,
}: {
  apps?: ConferencingApp[];
  onAppsChange?: (apps: ConferencingApp[]) => void;
}) {
  const [localApps, setLocalApps] = useState(apps);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [appToRemove, setAppToRemove] = useState<ConferencingApp | null>(null);

  const currentApps = onAppsChange ? apps : localApps;

  function setApps(next: ConferencingApp[]) {
    if (onAppsChange) {
      onAppsChange(next);
    } else {
      setLocalApps(next);
    }
  }

  function handleRemoveClick(app: ConferencingApp) {
    setAppToRemove(app);
    setRemoveDialogOpen(true);
  }

  function handleRemoveConfirm() {
    if (!appToRemove) return;
    const next = currentApps.filter((a) => a.id !== appToRemove.id);
    setApps(next);
    setRemoveDialogOpen(false);
    setAppToRemove(null);
  }

  function handleRemoveDialogOpenChange(open: boolean) {
    setRemoveDialogOpen(open);
    if (!open) setAppToRemove(null);
  }

  if (currentApps.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <VideoIcon />
          </EmptyMedia>
          <EmptyTitle>No conferencing apps</EmptyTitle>
          <EmptyDescription>
            Try adding a conference app for video calls with your clients
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline">Connect conference apps</Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <>
      {currentApps.map((app) => (
        <ListItem key={app.id}>
          <ListItemContent>
            <ListItemHeader>
              <div className="flex items-start gap-4">
                <Image
                  alt={app.alt}
                  className="size-10 shrink-0"
                  height={40}
                  src={app.logo}
                  width={40}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <ListItemTitle>{app.name}</ListItemTitle>
                    {app.isDefault && <Badge variant="success">Default</Badge>}
                  </div>
                  <ListItemDescription>{app.description}</ListItemDescription>
                </div>
              </div>
            </ListItemHeader>
          </ListItemContent>
          <ListItemActions>
            <Menu>
              <Tooltip>
                <MenuTrigger
                  render={
                    <TooltipTrigger
                      render={
                        <Button
                          aria-label="Options"
                          size="icon"
                          variant="outline"
                        >
                          <EllipsisIcon />
                        </Button>
                      }
                    />
                  }
                />
                <TooltipPopup>Options</TooltipPopup>
              </Tooltip>
              <MenuPopup align="end">
                <MenuItem disabled={app.isDefault}>
                  <PencilIcon />
                  Set as default
                </MenuItem>
                <MenuItem
                  onClick={() => handleRemoveClick(app)}
                  variant="destructive"
                >
                  <Trash2Icon />
                  Remove app
                </MenuItem>
              </MenuPopup>
            </Menu>
          </ListItemActions>
        </ListItem>
      ))}

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
