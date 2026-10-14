"use client";

import { Button } from "@coss/ui/components/button";
import {
  Command,
  CommandCollection,
  CommandDialog,
  CommandDialogPopup,
  CommandDialogTrigger,
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
  CommandPanel,
} from "@coss/ui/components/command";
import { Kbd, KbdGroup } from "@coss/ui/components/kbd";
import {
  BuildingIcon,
  CornerDownLeftIcon,
  FolderIcon,
  type LucideIcon,
  SearchIcon,
  SettingsIcon,
  ShieldIcon,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import {
  ENVIRONMENT_NAV,
  environmentPath,
  type NavItem,
  ORGANIZATION_NAV,
  ORGANIZATION_SETTINGS_NAV,
} from "@/lib/navigation";
import { THEME_OPTIONS } from "./theme-options";
import type { ShellOrganization, ShellProject } from "./types";

type CommandEntry = {
  /** Unique within the menu (Base UI keys highlighting by it). */
  value: string;
  label: string;
  /** Extra words to match ("production" for an environment). */
  keywords?: string;
  icon: LucideIcon;
  href?: string;
  run?: () => void;
};

type CommandSection = { value: string; items: CommandEntry[] };

export type CommandMenuData = {
  organization?: ShellOrganization;
  organizations?: ShellOrganization[];
  projects?: ShellProject[];
  isAdmin: boolean;
};

function navEntries(group: string, base: string, items: NavItem[]): CommandEntry[] {
  return items.map((item) => ({
    value: `${group} ${base}${item.path}`,
    label: item.label,
    keywords: group,
    icon: item.icon,
    href: base + item.path,
  }));
}

/** The ⌘K menu: every page of the current environment and organization, projects, orgs, theme. */
export function CommandMenu({ data }: { data: CommandMenuData }) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const params = useParams<{ projectSlug?: string; envSlug?: string }>();
  const [open, setOpen] = useState(false);
  const isMac = useIsMac();

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key !== "k" || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      setOpen((value) => !value);
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const sections = useMemo<CommandSection[]>(() => {
    const result: CommandSection[] = [];
    const org = data.organization;
    const project = data.projects?.find((item) => item.slug === params.projectSlug);
    const environment = project?.environments.find((item) => item.slug === params.envSlug);
    if (org && project && environment) {
      const base = environmentPath(org.slug, project.slug, environment.slug);
      result.push({
        value: `${project.name} · ${environment.name}`,
        items: ENVIRONMENT_NAV.flatMap((group) =>
          navEntries(group.label ?? project.name, base, group.items),
        ),
      });
    }
    if (org) {
      result.push({
        value: org.name,
        items: [
          ...navEntries("Organization", `/${org.slug}`, ORGANIZATION_NAV),
          ...navEntries("Settings", `/${org.slug}/settings`, ORGANIZATION_SETTINGS_NAV.slice(1)),
        ],
      });
    }
    if (org && data.projects && data.projects.length > 0) {
      result.push({
        value: "Projects",
        items: data.projects.flatMap((item) =>
          item.environments.map((env) => ({
            value: `project ${item.slug} ${env.slug}`,
            label: `${item.name} · ${env.name}`,
            keywords: `${item.slug} ${env.slug} ${env.mode}`,
            icon: FolderIcon,
            href: environmentPath(org.slug, item.slug, env.slug),
          })),
        ),
      });
    }
    if (data.organizations && data.organizations.length > 1) {
      result.push({
        value: "Organizations",
        items: data.organizations.map((item) => ({
          value: `org ${item.slug}`,
          label: item.name,
          keywords: item.slug,
          icon: BuildingIcon,
          href: `/${item.slug}`,
        })),
      });
    }
    result.push({
      value: "Account",
      items: [
        {
          value: "account settings",
          label: "Account settings",
          icon: SettingsIcon,
          href: "/settings",
        },
        ...(data.isAdmin
          ? [{ value: "admin", label: "Admin console", icon: ShieldIcon, href: "/admin" }]
          : []),
        ...THEME_OPTIONS.map((option) => ({
          value: `theme ${option.value}`,
          label: `${option.label} theme`,
          keywords: "theme appearance",
          icon: option.icon,
          run: () => setTheme(option.value),
        })),
      ],
    });
    return result;
  }, [data, params.projectSlug, params.envSlug, setTheme]);

  function select(entry: CommandEntry) {
    setOpen(false);
    if (entry.href) router.push(entry.href);
    else entry.run?.();
  }

  return (
    <CommandDialog onOpenChange={setOpen} open={open}>
      <CommandDialogTrigger
        aria-label="Search"
        className="justify-start text-muted-foreground max-sm:size-8 max-sm:justify-center max-sm:px-0 sm:w-56"
        render={<Button size="sm" variant="outline" />}
      >
        <SearchIcon />
        <span className="flex-1 text-left max-sm:hidden">Search…</span>
        <KbdGroup className="max-sm:hidden">
          <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </CommandDialogTrigger>
      <CommandDialogPopup>
        <Command
          items={sections}
          itemToStringValue={(item) => {
            const entry = item as CommandEntry;
            return `${entry.label} ${entry.keywords ?? ""}`;
          }}
        >
          <CommandInput placeholder="Go to a page, project or setting…" />
          <CommandPanel>
            <CommandEmpty>Nothing found.</CommandEmpty>
            <CommandList>
              {(section: CommandSection) => (
                <CommandGroup items={section.items} key={section.value}>
                  <CommandGroupLabel>{section.value}</CommandGroupLabel>
                  <CommandCollection>
                    {(entry: CommandEntry) => {
                      const Icon = entry.icon;
                      return (
                        <CommandItem
                          className="flex w-full items-center gap-2"
                          key={entry.value}
                          onClick={() => select(entry)}
                          value={entry}
                        >
                          <Icon className="size-4 shrink-0 opacity-72" />
                          <span className="flex-1 truncate">{entry.label}</span>
                        </CommandItem>
                      );
                    }}
                  </CommandCollection>
                </CommandGroup>
              )}
            </CommandList>
          </CommandPanel>
          <CommandFooter>
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap">Open</span>
              <Kbd>
                <CornerDownLeftIcon />
              </Kbd>
            </div>
          </CommandFooter>
        </Command>
      </CommandDialogPopup>
    </CommandDialog>
  );
}

function useIsMac(): boolean {
  const [isMac, setIsMac] = useState(true);
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
  }, []);
  return isMac;
}
