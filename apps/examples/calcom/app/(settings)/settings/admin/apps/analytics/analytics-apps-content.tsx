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
import { Card, CardPanel } from "@coss/ui/components/card";
import {
  Dialog,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@coss/ui/components/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@coss/ui/components/empty";
import { Field, FieldLabel } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@coss/ui/components/input-group";
import { ScrollArea } from "@coss/ui/components/scroll-area";
import { Switch } from "@coss/ui/components/switch";
import { toastManager } from "@coss/ui/components/toast";
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import { useMediaQuery } from "@coss/ui/hooks/use-media-query";
import {
  BarChart3Icon,
  CalendarIcon,
  CameraIcon,
  CreditCardIcon,
  HashIcon,
  Link2Icon,
  MessageSquareIcon,
  SearchIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  AppHeader,
  AppHeaderContent,
  AppHeaderDescription,
} from "@/components/app/app-header";
import {
  ListItem,
  ListItemActions,
  ListItemContent,
  ListItemDescription,
  ListItemHeader,
  ListItemTitle,
} from "@/components/list-item";

interface AnalyticsApp {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
  configured?: boolean;
  configurable?: boolean;
  slug: string;
}

const ANALYTICS_APPS: AnalyticsApp[] = [
  {
    configurable: false,
    description:
      "Privacy-first web analytics for devs (Google Analytics alternative) — 3 KB, GDPR-compliant",
    enabled: false,
    icon: BarChart3Icon,
    id: "databuddy",
    name: "Databuddy",
    slug: "databuddy",
  },
  {
    configurable: true,
    configured: true,
    description:
      "Dub is the modern link attribution platform for you to create short links, track conversion analytics, and run affiliate programs.",
    enabled: true,
    icon: Link2Icon,
    id: "dub",
    name: "Dub",
    slug: "dub",
  },
  {
    configurable: false,
    description:
      "Fathom Analytics provides simple, privacy-focused website analytics. We're a GDPR-compliant, Google Analytics alternative.",
    enabled: false,
    icon: BarChart3Icon,
    id: "fathom",
    name: "Fathom",
    slug: "fathom",
  },
  {
    configurable: true,
    description:
      "Google Analytics is a web analytics service offered by Google that tracks and reports website traffic, currently as a platform inside the Google Marketing Platform brand.",
    enabled: false,
    icon: BarChart3Icon,
    id: "google-analytics",
    name: "Google Analytics",
    slug: "google-analytics",
  },
  {
    configurable: false,
    description: "App to install Google Tag Manager",
    enabled: false,
    icon: BarChart3Icon,
    id: "google-tag-manager",
    name: "Google Tag Manager",
    slug: "google-tag-manager",
  },
  {
    configurable: false,
    description:
      "Insihts is an all-in-one platform for businesses looking to track user behavior, optimize workflows, and make data-driven decisions. Whether you are a marketer, product manager, or part of a customer success team, Insihts provides the tools you need to succeed.",
    enabled: false,
    icon: BarChart3Icon,
    id: "insihts",
    name: "Insihts",
    slug: "insihts",
  },
  {
    configurable: false,
    description:
      "Google Analytics alternative that protects your data and your customers' privacy",
    enabled: false,
    icon: BarChart3Icon,
    id: "matomo",
    name: "Matomo",
    slug: "matomo",
  },
  {
    configurable: true,
    description:
      "Add Meta Pixel to your bookings page to measure, optimize and build audiences for your ad campaigns.",
    enabled: false,
    icon: BarChart3Icon,
    id: "meta-pixel",
    name: "Meta Pixel",
    slug: "meta-pixel",
  },
  {
    configurable: false,
    description: "Simple, privacy-friendly Google Analytics",
    enabled: false,
    icon: BarChart3Icon,
    id: "plausible",
    name: "Plausible",
    slug: "plausible",
  },
];

const APP_CATEGORIES = [
  {
    href: "/settings/admin/apps/analytics",
    icon: BarChart3Icon,
    id: "analytics",
    label: "Analytics",
  },
  {
    href: "/settings/admin/apps/analytics",
    icon: Link2Icon,
    id: "ai-automation",
    label: "AI & Automation",
  },
  {
    href: "/settings/admin/apps/analytics",
    icon: CalendarIcon,
    id: "calendar",
    label: "Calendar",
  },
  {
    href: "/settings/admin/apps/analytics",
    icon: CameraIcon,
    id: "conferencing",
    label: "Conferencing",
  },
  {
    href: "/settings/admin/apps/analytics",
    icon: BarChart3Icon,
    id: "crm",
    label: "CRM",
  },
  {
    href: "/settings/admin/apps/analytics",
    icon: MessageSquareIcon,
    id: "messaging",
    label: "Messaging",
  },
  {
    href: "/settings/admin/apps/analytics",
    icon: CreditCardIcon,
    id: "payment",
    label: "Payment",
  },
  {
    href: "/settings/admin/apps/analytics",
    icon: HashIcon,
    id: "other",
    label: "Other",
  },
] as const;

function AppIcon({
  icon: Icon,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted"
    >
      <Icon className={className ?? "size-5 text-muted-foreground"} />
    </div>
  );
}

function AnalyticsAppRow({
  app,
  onToggle,
  onConfigure,
}: {
  app: AnalyticsApp;
  onToggle: (slug: string, checked: boolean) => void;
  onConfigure: (slug: string) => void;
}) {
  const Icon = app.icon;

  return (
    <ListItem>
      <ListItemContent>
        <div className="flex min-w-0 items-start gap-4">
          <AppIcon icon={Icon} />
          <ListItemHeader>
            <ListItemTitle>{app.name}</ListItemTitle>
            <ListItemDescription className="line-clamp-2">
              {app.description}
            </ListItemDescription>
            {app.configurable && (
              <Button
                aria-label={`Edit ${app.name} keys`}
                className="mt-2 w-fit"
                onClick={() => onConfigure(app.slug)}
                size="xs"
                variant="outline"
              >
                Edit keys
              </Button>
            )}
          </ListItemHeader>
        </div>
      </ListItemContent>
      <ListItemActions>
        <Tooltip>
          <TooltipTrigger
            render={
              <Switch
                checked={app.enabled}
                onCheckedChange={(checked) => onToggle(app.slug, checked)}
              />
            }
          />
          <TooltipPopup sideOffset={11}>
            {app.enabled ? `Disable ${app.name}` : `Enable ${app.name}`}
          </TooltipPopup>
        </Tooltip>
      </ListItemActions>
    </ListItem>
  );
}

export function AnalyticsAppsContent() {
  const isSmallScreen = useMediaQuery("max-sm");
  const pathname = usePathname();
  const router = useRouter();
  const [apps, setApps] = useState(ANALYTICS_APPS);
  const [searchQuery, setSearchQuery] = useState("");
  const [disableDialogAppSlug, setDisableDialogAppSlug] = useState<
    string | null
  >(null);
  const [editDialogAppSlug, setEditDialogAppSlug] = useState<string | null>(
    null,
  );
  const [editKeys, setEditKeys] = useState({
    client_id: "",
    client_secret: "",
  });

  const filteredApps = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return apps;

    return apps.filter(
      (app) =>
        app.name.toLowerCase().includes(query) ||
        app.description.toLowerCase().includes(query),
    );
  }, [apps, searchQuery]);

  function handleToggle(slug: string, checked: boolean) {
    if (!checked) {
      setDisableDialogAppSlug(slug);
      return;
    }

    setApps((prev) =>
      prev.map((app) =>
        app.slug === slug ? { ...app, enabled: checked } : app,
      ),
    );
    toastManager.add({
      title: "App enabled",
      type: "success",
    });
  }

  function handleDisableConfirm() {
    if (!disableDialogAppSlug) return;

    setApps((prev) =>
      prev.map((app) =>
        app.slug === disableDialogAppSlug ? { ...app, enabled: false } : app,
      ),
    );
    toastManager.add({
      title: "App disabled",
      type: "success",
    });
    setDisableDialogAppSlug(null);
  }

  function handleDisableDialogOpenChange(open: boolean) {
    if (!open) setDisableDialogAppSlug(null);
  }

  function handleConfigure(slug: string) {
    setEditKeys({ client_id: "", client_secret: "" });
    setEditDialogAppSlug(slug);
  }

  function handleEditDialogOpenChange(open: boolean) {
    if (!open) setEditDialogAppSlug(null);
  }

  function handleEditKeysSave() {
    toastManager.add({
      title: "Keys saved",
      type: "success",
    });
    setEditDialogAppSlug(null);
  }

  const renderCategoryButton = (category: (typeof APP_CATEGORIES)[number]) => {
    const Icon = category.icon;
    const isActive = pathname.endsWith("/analytics")
      ? category.id === "analytics"
      : pathname === category.href;

    return (
      <Button
        className="w-full justify-start gap-2"
        data-pressed={isActive ? true : undefined}
        key={category.id}
        onClick={() => router.push(category.href)}
        variant="ghost"
      >
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        {category.label}
      </Button>
    );
  };

  return (
    <>
      <AlertDialog
        onOpenChange={handleDisableDialogOpenChange}
        open={disableDialogAppSlug !== null}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable app</AlertDialogTitle>
            <AlertDialogDescription>
              Disabling this app could cause problems with how your users
              interact with Cal
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>
              Cancel
            </AlertDialogClose>
            <AlertDialogClose
              onClick={handleDisableConfirm}
              render={<Button>Confirm</Button>}
            />
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>

      <Dialog
        onOpenChange={handleEditDialogOpenChange}
        open={editDialogAppSlug !== null}
      >
        <DialogPopup showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Edit keys</DialogTitle>
          </DialogHeader>
          <DialogPanel className="flex flex-col gap-4">
            <Field>
              <FieldLabel>client_id</FieldLabel>
              <Input
                onChange={(e) =>
                  setEditKeys((prev) => ({
                    ...prev,
                    client_id: e.currentTarget.value,
                  }))
                }
                type="text"
                value={editKeys.client_id}
              />
            </Field>
            <Field>
              <FieldLabel>client_secret</FieldLabel>
              <Input
                onChange={(e) =>
                  setEditKeys((prev) => ({
                    ...prev,
                    client_secret: e.currentTarget.value,
                  }))
                }
                type="text"
                value={editKeys.client_secret}
              />
            </Field>
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>Close</DialogClose>
            <Button onClick={handleEditKeysSave}>Save</Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>

      <AppHeader>
        <AppHeaderContent title="Apps">
          <AppHeaderDescription>
            Enable apps for your instance of Cal
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <div className="flex flex-col gap-6 sm:flex-row">
        {isSmallScreen ? (
          <ScrollArea
            className="-mx-4 max-sm:w-[calc(100%+--spacing(4)*2)]"
            scrollbarGutter
          >
            <div className="flex w-max gap-0.5 px-4">
              {APP_CATEGORIES.map((category) => (
                <div className="shrink-0" key={category.id}>
                  {renderCategoryButton(category)}
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <nav
            aria-label="App categories"
            className="hidden shrink-0 sm:flex sm:w-48 sm:flex-col sm:gap-0.5"
          >
            {APP_CATEGORIES.map(renderCategoryButton)}
          </nav>
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-4">
            <InputGroup className="w-full">
              <InputGroupInput
                aria-label="Search analytics apps"
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                placeholder="Search apps…"
                type="search"
                value={searchQuery}
              />
              <InputGroupAddon>
                <SearchIcon aria-hidden="true" />
              </InputGroupAddon>
            </InputGroup>
          </div>

          {filteredApps.length > 0 ? (
            <Card>
              <CardPanel className="p-0">
                {filteredApps.map((app) => (
                  <AnalyticsAppRow
                    app={app}
                    key={app.id}
                    onConfigure={handleConfigure}
                    onToggle={handleToggle}
                  />
                ))}
              </CardPanel>
            </Card>
          ) : (
            <Empty className="rounded-xl border border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchIcon aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No apps found</EmptyTitle>
                <EmptyDescription>
                  Try a different search term or browse another category
                </EmptyDescription>
              </EmptyHeader>
              <Button onClick={() => setSearchQuery("")} variant="outline">
                Clear search
              </Button>
            </Empty>
          )}
        </div>
      </div>
    </>
  );
}
