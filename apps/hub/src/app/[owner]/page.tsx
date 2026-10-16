import { Button } from "@coss/ui/components/button";
import { BuildingIcon, LinkIcon, MapPinIcon, RocketIcon, StarIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContributionGraph } from "@/components/contribution-graph";
import { PromptList } from "@/components/prompt-list";
import { UserAvatar } from "@/components/user-avatar";
import { compact, number } from "@/lib/format";
import { findUserByHandle } from "@/lib/profiles";
import { currentUser } from "@/lib/session";
import { getOrganization, getUser, listProjects, listPromptRequests } from "@/lib/store";
import type { Project } from "@/lib/types";

/** `/<handle>`: a person's profile, GitHub's layout; `/<org>`: the organization's projects. */
export default async function OwnerPage({ params }: PageProps<"/[owner]">) {
  const { owner } = await params;
  const org = getOrganization(owner);
  if (org) return <OrganizationPage slug={owner} />;
  const user = getUser(owner) ?? (await findUserByHandle(owner));
  if (!user) notFound();
  const viewer = await currentUser();
  const projects = listProjects().filter((p) =>
    p.contributors.some((c) => c.handle === user.handle),
  );
  const total = projects.reduce(
    (sum, p) => sum + (p.contributors.find((c) => c.handle === user.handle)?.prompts ?? 0),
    0,
  );
  const prompts = listPromptRequests({ author: user.handle });
  return (
    <main className="container grid w-full gap-8 px-4 py-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:px-6">
      <aside className="flex flex-col gap-4">
        <UserAvatar className="size-40 text-4xl sm:size-64 lg:size-72" handle={user.handle} />
        <div>
          <h1 className="font-semibold text-2xl tracking-[-0.02em]">{user.name}</h1>
          <p className="text-muted-foreground text-lg">{user.handle}</p>
        </div>
        {user.bio && <p className="leading-snug">{user.bio}</p>}
        {viewer?.handle === user.handle ? (
          <Button render={<Link href="/onboarding?next=/settings" />} size="sm" variant="outline">
            Edit profile
          </Button>
        ) : (
          <Button size="sm" variant="outline">
            Follow
          </Button>
        )}
        <ul className="flex flex-col gap-1.5 text-sm">
          <li className="flex items-center gap-2 text-muted-foreground">
            <UsersIcon aria-hidden className="size-4" />
            <span>
              <strong className="font-semibold text-foreground">{compact(user.followers)}</strong>{" "}
              followers ·{" "}
              <strong className="font-semibold text-foreground">{compact(user.following)}</strong>{" "}
              following
            </span>
          </li>
          {user.company && (
            <li className="flex items-center gap-2">
              <BuildingIcon aria-hidden className="size-4 text-muted-foreground" />
              {user.company}
            </li>
          )}
          {user.location && (
            <li className="flex items-center gap-2">
              <MapPinIcon aria-hidden className="size-4 text-muted-foreground" />
              {user.location}
            </li>
          )}
          {user.website && (
            <li className="flex items-center gap-2">
              <LinkIcon aria-hidden className="size-4 text-muted-foreground" />
              <a className="hover:underline" href={user.website} rel="noreferrer">
                {user.website.replace(/^https?:\/\//, "")}
              </a>
            </li>
          )}
        </ul>
      </aside>
      <div className="flex min-w-0 flex-col gap-6">
        <section className="flex flex-col gap-3">
          <h2 className="font-medium text-sm">Pinned</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {projects.map((project) => (
              <ProjectCard
                key={`${project.owner}/${project.slug}`}
                project={project}
                prompts={project.contributors.find((c) => c.handle === user.handle)?.prompts ?? 0}
              />
            ))}
          </ul>
        </section>
        <section className="rounded-lg border">
          <h2 className="border-b px-4 py-2.5 font-medium text-sm">
            {number(total)} prompts to production
          </h2>
          <div className="overflow-x-auto px-4 py-4">
            <ContributionGraph seed={user.handle} total={total} />
          </div>
        </section>
        <section className="rounded-lg border" id="prompts">
          <h2 className="border-b px-4 py-2.5 font-medium text-sm">Prompt requests</h2>
          <PromptList items={prompts} showProject />
        </section>
      </div>
    </main>
  );
}

function OrganizationPage({ slug }: { slug: string }) {
  const org = getOrganization(slug);
  if (!org) notFound();
  const projects = listProjects(slug);
  return (
    <main className="container flex w-full flex-col gap-6 py-6">
      <header className="flex items-center gap-4">
        <UserAvatar className="size-16 text-xl" handle={slug} square />
        <div>
          <h1 className="font-semibold text-2xl tracking-[-0.02em]">{org.name}</h1>
          {org.description && <p className="text-muted-foreground">{org.description}</p>}
          <p className="flex flex-wrap gap-3 pt-1 text-muted-foreground text-sm">
            {org.location && (
              <span className="flex items-center gap-1">
                <MapPinIcon aria-hidden className="size-3.5" /> {org.location}
              </span>
            )}
            {org.website && (
              <a
                className="flex items-center gap-1 hover:underline"
                href={org.website}
                rel="noreferrer"
              >
                <LinkIcon aria-hidden className="size-3.5" />{" "}
                {org.website.replace(/^https?:\/\//, "")}
              </a>
            )}
            <span className="flex items-center gap-1">
              <UsersIcon aria-hidden className="size-3.5" /> {org.members.length} members
            </span>
          </p>
        </div>
      </header>
      <ul className="grid gap-3 md:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </ul>
    </main>
  );
}

export function ProjectCard({ project, prompts }: { project: Project; prompts?: number }) {
  return (
    <li className="flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <UserAvatar className="size-5" handle={project.owner} square />
        <Link className="font-semibold hover:underline" href={`/${project.owner}/${project.slug}`}>
          {project.owner}/{project.name}
        </Link>
        <span className="rounded-full border px-1.5 font-mono text-[10px] text-muted-foreground">
          Public
        </span>
      </div>
      <p className="text-muted-foreground text-sm">{project.description}</p>
      <p className="mt-auto flex items-center gap-4 pt-1 text-muted-foreground text-xs">
        <span className="flex items-center gap-1">
          <StarIcon aria-hidden className="size-3.5" /> {compact(project.stars)}
        </span>
        <span className="flex items-center gap-1">
          <RocketIcon aria-hidden className="size-3.5" />{" "}
          {prompts !== undefined ? `${number(prompts)} of ` : ""}
          {number(project.promptsToProduction)} prompts to production
        </span>
      </p>
    </li>
  );
}
