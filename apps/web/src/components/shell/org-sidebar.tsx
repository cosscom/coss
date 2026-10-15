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
import { CheckIcon, ChevronDownIcon, ChevronsUpDownIcon, FolderIcon, PlusIcon } from "lucide-react";
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
 * The sidebar of an organization's pages: the wordmark with the organization menu, the current
 * project and environment with the environment's pages, then the organization's own pages.
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
        <SidebarWordmark
          href={orgBase}
          label={
            <OrganizationMenu current={props.organization} organizations={props.organizations} />
          }
        />
        {project && environment ? (
          <div className="flex flex-col gap-1">
            <OrganizationIcon current={props.organization} organizations={props.organizations} />
            <ProjectSwitcher
              current={{ project, environment }}
              hrefIn={hrefIn}
              orgSlug={props.organization.slug}
              projects={props.projects}
            />
          </div>
        ) : (
          // Hidden unless the sidebar is collapsed to icons (and then the header's only item).
          <OrganizationIcon current={props.organization} organizations={props.organizations} />
        )}
      </SidebarHeader>
      <SidebarContent>
        {project && environment && envBase ? (
          ENVIRONMENT_NAV.map((group) => (
            <NavGroup
              active={activeEnvItem}
              base={envBase}
              items={group.items}
              key={group.label ?? "overview"}
              label={group.label}
            />
          ))
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

/** The organization menu's items: every organization (the current one with its role), then a new one. */
function OrganizationMenuItems(props: {
  current: ShellOrganization & { role: string };
  organizations: ShellOrganization[];
}) {
  return (
    <>
      <MenuGroup>
        <MenuGroupLabel>Organizations</MenuGroupLabel>
        {props.organizations.map((org) => (
          <MenuLinkItem key={org.slug} render={<Link href={`/${org.slug}`} />}>
            <CheckIcon className={org.slug === props.current.slug ? "" : "invisible"} />
            <span className="min-w-0 flex-1 truncate">{org.name}</span>
            {org.slug === props.current.slug ? (
              <span className="ms-3 text-muted-foreground text-xs capitalize">
                {props.current.role}
              </span>
            ) : null}
          </MenuLinkItem>
        ))}
      </MenuGroup>
      <MenuSeparator />
      <MenuLinkItem render={<Link href="/onboarding" />}>
        <PlusIcon />
        New organization
      </MenuLinkItem>
    </>
  );
}

/** The organization next to the wordmark (`coss.com acme`), opening the organization menu. */
function OrganizationMenu(props: {
  current: ShellOrganization & { role: string };
  organizations: ShellOrganization[];
}) {
  return (
    <Menu>
      <MenuTrigger className="flex min-w-0 items-center gap-1 rounded-md outline-none transition-colors hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring data-popup-open:text-muted-foreground">
        <span className="truncate">{props.current.name}</span>
        <ChevronDownIcon className="size-4 shrink-0" strokeWidth={2.25} />
      </MenuTrigger>
      <MenuPopup align="start" className="min-w-60" side="bottom">
        <OrganizationMenuItems current={props.current} organizations={props.organizations} />
      </MenuPopup>
    </Menu>
  );
}

/** With the sidebar collapsed to icons the wordmark is hidden: the organization's initial instead. */
function OrganizationIcon(props: {
  current: ShellOrganization & { role: string };
  organizations: ShellOrganization[];
}) {
  return (
    <SidebarMenu className="hidden group-data-[collapsible=icon]:flex">
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
            <span className="truncate font-medium text-foreground">{props.current.name}</span>
          </MenuTrigger>
          <MenuPopup align="start" className="min-w-60" side="right">
            <OrganizationMenuItems current={props.current} organizations={props.organizations} />
          </MenuPopup>
        </Menu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

/**
 * The current project and environment in one row, like the organization switcher above it. Its
 * menu switches the environment (same project) or the project (same environment when it has one,
 * else its default), keeping the current section.
 */
function ProjectSwitcher(props: {
  orgSlug: string;
  projects: ShellProject[];
  current: { project: ShellProject; environment: ShellProject["environments"][number] };
  hrefIn: (projectSlug: string, envSlug: string) => string;
}) {
  const { isMobile } = useSidebar();
  const { project, environment } = props.current;
  const envSlugIn = (item: ShellProject) =>
    item.environments.some((env) => env.slug === environment.slug)
      ? environment.slug
      : item.defaultEnvironment;
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Menu>
          <MenuTrigger
            render={
              <SidebarMenuButton
                className="data-popup-open:bg-sidebar-accent"
                size="lg"
                tooltip={`${project.name} · ${environment.name}`}
              />
            }
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background shadow-xs/5">
              <FolderIcon className="size-4 text-muted-foreground" strokeWidth={1.75} />
            </span>
            <div className="grid min-w-0 flex-1 text-left leading-tight">
              <span className="truncate font-medium text-foreground">{project.name}</span>
              <StatusDot
                className="min-w-0 text-muted-foreground text-xs"
                tone={environment.mode === "live" ? "success" : "info"}
              >
                <span className="truncate">{environment.name}</span>
              </StatusDot>
            </div>
            <ChevronsUpDownIcon className="ms-auto size-4" />
          </MenuTrigger>
          <MenuPopup align="start" className="min-w-60" side={isMobile ? "bottom" : "right"}>
            {project.environments.length > 1 ? (
              <>
                <MenuGroup>
                  <MenuGroupLabel>Environment</MenuGroupLabel>
                  {project.environments.map((env) => (
                    <MenuLinkItem
                      key={env.slug}
                      render={<Link href={props.hrefIn(project.slug, env.slug)} />}
                    >
                      <CheckIcon className={env.slug === environment.slug ? "" : "invisible"} />
                      <StatusDot tone={env.mode === "live" ? "success" : "info"}>
                        {env.name}
                      </StatusDot>
                    </MenuLinkItem>
                  ))}
                </MenuGroup>
                <MenuSeparator />
              </>
            ) : null}
            <MenuGroup>
              <MenuGroupLabel>Projects</MenuGroupLabel>
              {props.projects.map((item) => {
                const envSlug = envSlugIn(item);
                if (!envSlug) return null;
                return (
                  <MenuLinkItem
                    key={item.slug}
                    render={<Link href={props.hrefIn(item.slug, envSlug)} />}
                  >
                    <CheckIcon className={item.slug === project.slug ? "" : "invisible"} />
                    <span className="truncate">{item.name}</span>
                  </MenuLinkItem>
                );
              })}
            </MenuGroup>
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

/** Outside a project: the organization's projects, each opening its default environment. */
function ProjectList(props: { orgSlug: string; projects: ShellProject[] }) {
  const { setOpenMobile } = useSidebar();
  if (props.projects.length === 0) return null;
  return (
    <SidebarGroup className="py-1">
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {props.projects.map((project) => {
            const opens = project.defaultEnvironment;
            if (!opens) return null;
            return (
              <SidebarMenuItem key={project.slug}>
                <SidebarMenuButton
                  render={
                    <Link
                      href={environmentPath(props.orgSlug, project.slug, opens)}
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
