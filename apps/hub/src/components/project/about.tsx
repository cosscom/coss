import { ActivityIcon, BookOpenIcon, EyeIcon, LinkIcon, StarIcon } from "lucide-react";
import Link from "next/link";
import { compact, number, relative } from "@/lib/format";
import type { Project } from "@/lib/types";
import { UserAvatar } from "../user-avatar";

/** GitHub's About column: what's left of it once there is no code, licence or branch to point at. */
export function About({ project }: { project: Project }) {
  const base = `/${project.owner}/${project.slug}`;
  return (
    <aside className="flex flex-col gap-6 text-sm">
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">About</h2>
        <p className="text-base leading-snug">{project.description}</p>
        {project.website && (
          <a
            className="flex items-center gap-2 font-medium hover:underline"
            href={project.website}
            rel="noreferrer"
          >
            <LinkIcon aria-hidden className="size-4 text-muted-foreground" />
            {project.website.replace(/^https?:\/\//, "")}
          </a>
        )}
        <ul className="flex flex-wrap gap-1.5">
          {project.topics.map((topic) => (
            <li className="rounded-full bg-muted px-2.5 py-0.5 font-mono text-xs" key={topic}>
              {topic}
            </li>
          ))}
        </ul>
        <ul className="flex flex-col gap-2 text-muted-foreground">
          <li>
            <Link className="flex items-center gap-2 hover:text-foreground" href={base}>
              <BookOpenIcon aria-hidden className="size-4" /> Readme
            </Link>
          </li>
          <li>
            <Link
              className="flex items-center gap-2 hover:text-foreground"
              href={`${base}/insights`}
            >
              <ActivityIcon aria-hidden className="size-4" /> Activity
            </Link>
          </li>
          <li className="flex items-center gap-2">
            <StarIcon aria-hidden className="size-4" />
            <span>
              <strong className="font-semibold text-foreground">{compact(project.stars)}</strong>{" "}
              stars
            </span>
          </li>
          <li className="flex items-center gap-2">
            <EyeIcon aria-hidden className="size-4" />
            <span>
              <strong className="font-semibold text-foreground">{number(project.watchers)}</strong>{" "}
              watching
            </span>
          </li>
        </ul>
      </section>
      <hr />
      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          Releases
          <span className="rounded-full bg-muted px-1.5 font-mono text-[11px] text-muted-foreground">
            {project.releasesCount}
          </span>
        </h2>
        <p className="flex flex-col">
          <span className="font-medium">{project.latestRelease.name}</span>
          <span className="text-muted-foreground text-xs">
            Latest · {relative(project.latestRelease.publishedAt)}
          </span>
        </p>
      </section>
      <hr />
      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          Contributors
          <span className="rounded-full bg-muted px-1.5 font-mono text-[11px] text-muted-foreground">
            {number(project.contributorsCount)}
          </span>
        </h2>
        <ul className="flex flex-wrap gap-1.5">
          {project.contributors.map((contributor) => (
            <li key={contributor.handle}>
              <Link
                href={`/${contributor.handle}`}
                title={`${contributor.handle} · ${number(contributor.prompts)} prompts to production`}
              >
                <UserAvatar className="size-8" handle={contributor.handle} />
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground text-xs">
          + {number(project.contributorsCount - project.contributors.length)} contributors
        </p>
      </section>
      <hr />
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Factory</h2>
        <dl className="flex flex-col gap-1.5">
          <Row label="Builds with" value={project.factory} />
          <Row label="Prompts to production" value={number(project.promptsToProduction)} />
          <Row label="Auto-allow" value={project.autoAllow.join(" · ")} />
        </dl>
      </section>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="shrink-0 whitespace-nowrap text-muted-foreground">{label}</dt>
      <span aria-hidden className="leader" />
      <dd className="text-right font-mono text-xs">{value}</dd>
    </div>
  );
}
