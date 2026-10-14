"use client";

import { Avatar, AvatarFallback } from "@coss/ui/components/avatar";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuLinkItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@coss/ui/components/menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@coss/ui/components/sidebar";
import { cn } from "@coss/ui/lib/utils";
import { CheckIcon, ChevronsUpDownIcon, FolderIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  activeNavItem,
  ENVIRONMENT_NAV,
  environmentPath,
  navItems,
  ORGANIZATION_NAV,
} from "@/lib/navigation";
import { StatusDot } from "../status-dot";
import { initials } from "./initials";
import { NavGroup } from "./nav-group";
import { SidebarDocsLink, SidebarWordmark } from "./sidebar-parts";
import type { ShellOrganization, ShellProject } from "./types";
import { type ShellUser, UserNav } from "./user-nav";

const ENVIRONMENT_ITEMS = navItems(ENVIRONMENT_NAV);

/**
 * The sidebar of an organization's pages: the organization switcher, the current project and
 * environment with the environment's pages, then the organization's own pages.
 */
export function OrgSidebar(props: {
  organization: ShellOrganization & { role: string };
  organizations: ShellOrganization[];
  projects: ShellProject[];
  user: ShellUser;
}) {
  const pathname = usePathname();
  const params = useParams<{ projectSlug?: string; envSlug?: string }>();
  const orgBase = `/${props.organization.slug}`;
  const project = props.projects.find((item) => item.slug === params.projectSlug);
  const environment = project?.environments.find((item) => item.slug === params.envSlug);
  const envBase =
    project && environment
      ? environmentPath(props.organization.slug, project.slug, environment.slug)
      : null;
  const activeEnvItem = envBase ? activeNavItem(pathname, envBase, ENVIRONMENT_ITEMS) : undefined;
  const activeOrgItem = activeNavItem(pathname, orgBase, ORGANIZATION_NAV);

  /** The same page in another environment (ids don't carry over, so only the section does). */
  const hrefIn = (projectSlug: string, envSlug: string) =>
    environmentPath(props.organization.slug, projectSlug, envSlug) + (activeEnvItem?.path ?? "");

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="gap-3">
        <SidebarWordmark />
        <OrganizationSwitcher current={props.organization} organizations={props.organizations} />
      </SidebarHeader>
      <SidebarContent>
        {project && environment && envBase ? (
          <>
            <SidebarGroup className="py-1">
              <SidebarGroupLabel>Project</SidebarGroupLabel>
              <SidebarGroupContent className="flex flex-col gap-2">
                <ProjectSwitcher
                  current={{ project, environment }}
                  hrefIn={hrefIn}
                  orgSlug={props.organization.slug}
                  projects={props.projects}
                />
                {project.environments.length > 1 ? (
                  <EnvironmentToggle
                    current={environment.slug}
                    environments={project.environments}
                    hrefFor={(envSlug) => hrefIn(project.slug, envSlug)}
                  />
                ) : null}
              </SidebarGroupContent>
            </SidebarGroup>
            {ENVIRONMENT_NAV.map((group) => (
              <NavGroup
                active={activeEnvItem}
                base={envBase}
                items={group.items}
                key={group.label ?? "overview"}
                label={group.label}
              />
            ))}
          </>
        ) : (
          <ProjectList orgSlug={props.organization.slug} projects={props.projects} />
        )}
        <NavGroup
          active={activeOrgItem}
          base={orgBase}
          items={ORGANIZATION_NAV}
          label="Organization"
        />
      </SidebarContent>
      <SidebarFooter>
        <SidebarDocsLink />
        <UserNav user={props.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function OrganizationSwitcher(props: {
  current: ShellOrganization & { role: string };
  organizations: ShellOrganization[];
}) {
  const { isMobile } = useSidebar();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Menu>
          <MenuTrigger
            render={
              <SidebarMenuButton
                className="data-popup-open:bg-sidebar-accent"
                size="lg"
                tooltip={props.current.name}
              />
            }
          >
            <Avatar className="size-8 rounded-lg bg-primary text-primary-foreground">
              <AvatarFallback className="rounded-lg bg-transparent font-semibold">
                {initials(props.current.name)}
              </AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 flex-1 text-left leading-tight">
              <span className="truncate font-medium text-foreground">{props.current.name}</span>
              <span className="truncate text-muted-foreground text-xs capitalize">
                {props.current.role}
              </span>
            </div>
            <ChevronsUpDownIcon className="ms-auto size-4" />
          </MenuTrigger>
          <MenuPopup align="start" className="min-w-60" side={isMobile ? "bottom" : "right"}>
            <MenuGroup>
              <MenuGroupLabel>Organizations</MenuGroupLabel>
              {props.organizations.map((org) => (
                <MenuLinkItem key={org.slug} render={<Link href={`/${org.slug}`} />}>
                  <CheckIcon className={org.slug === props.current.slug ? "" : "invisible"} />
                  <span className="truncate">{org.name}</span>
                </MenuLinkItem>
              ))}
            </MenuGroup>
            <MenuSeparator />
            <MenuLinkItem render={<Link href="/onboarding" />}>
              <PlusIcon />
              New organization
            </MenuLinkItem>
          </MenuPopup>
        </Menu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function ProjectSwitcher(props: {
  orgSlug: string;
  projects: ShellProject[];
  current: { project: ShellProject; environment: ShellProject["environments"][number] };
  hrefIn: (projectSlug: string, envSlug: string) => string;
}) {
  const { isMobile } = useSidebar();
  const { project, environment } = props.current;
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Menu>
          <MenuTrigger
            render={
              <SidebarMenuButton
                className="data-popup-open:bg-sidebar-accent"
                tooltip={`${project.name} · ${environment.name}`}
                variant="outline"
              />
            }
          >
            <FolderIcon />
            <span className="min-w-0 flex-1 truncate font-medium text-foreground">
              {project.name}
            </span>
            <ChevronsUpDownIcon className="ms-auto size-4" />
          </MenuTrigger>
          <MenuPopup align="start" className="min-w-60" side={isMobile ? "bottom" : "right"}>
            {props.projects.map((item) => (
              <MenuGroup key={item.slug}>
                <MenuGroupLabel>{item.name}</MenuGroupLabel>
                {item.environments.map((env) => (
                  <MenuLinkItem
                    key={env.slug}
                    render={<Link href={props.hrefIn(item.slug, env.slug)} />}
                  >
                    <CheckIcon
                      className={
                        item.slug === project.slug && env.slug === environment.slug
                          ? ""
                          : "invisible"
                      }
                    />
                    <StatusDot tone={env.mode === "live" ? "success" : "info"}>
                      {env.name}
                    </StatusDot>
                  </MenuLinkItem>
                ))}
              </MenuGroup>
            ))}
            <MenuSeparator />
            <MenuLinkItem render={<Link href={`/${props.orgSlug}`} />}>
              <FolderIcon />
              All projects
            </MenuLinkItem>
          </MenuPopup>
        </Menu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

/** Production / Development side by side, keeping the current section. */
function EnvironmentToggle(props: {
  environments: ShellProject["environments"];
  current: string;
  hrefFor: (envSlug: string) => string;
}) {
  const { setOpenMobile } = useSidebar();
  return (
    <div className="flex gap-0.5 rounded-lg bg-sidebar-accent p-0.5 group-data-[collapsible=icon]:hidden">
      {props.environments.map((env) => {
        const active = env.slug === props.current;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-7 min-w-0 flex-1 items-center justify-center rounded-md px-2 text-xs transition-colors",
              active
                ? "bg-background font-medium text-foreground shadow-sm/5 dark:bg-input"
                : "text-sidebar-foreground hover:text-foreground",
            )}
            href={props.hrefFor(env.slug)}
            key={env.slug}
            onNavigate={() => setOpenMobile(false)}
          >
            <StatusDot className="min-w-0" tone={env.mode === "live" ? "success" : "info"}>
              <span className="truncate">{env.name}</span>
            </StatusDot>
          </Link>
        );
      })}
    </div>
  );
}

/** Outside a project: the organization's projects, each opening its first environment. */
function ProjectList(props: { orgSlug: string; projects: ShellProject[] }) {
  const { setOpenMobile } = useSidebar();
  if (props.projects.length === 0) return null;
  return (
    <SidebarGroup className="py-1">
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {props.projects.map((project) => {
            const first = project.environments[0];
            if (!first) return null;
            return (
              <SidebarMenuItem key={project.slug}>
                <SidebarMenuButton
                  render={
                    <Link
                      href={environmentPath(props.orgSlug, project.slug, first.slug)}
                      onNavigate={() => setOpenMobile(false)}
                    />
                  }
                  tooltip={project.name}
                >
                  <FolderIcon />
                  <span>{project.name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
