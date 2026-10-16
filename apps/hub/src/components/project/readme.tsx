import { InfoIcon, LightbulbIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { number } from "@/lib/format";
import type { Project, ReadmeBlock } from "@/lib/types";
import { UserAvatar } from "../user-avatar";

/** A README rendered from blocks (`ReadmeBlock`): GitHub's look, nothing that needs a code font. */
export function Readme({ project }: { project: Project }) {
  return (
    <div className="flex flex-col gap-5 px-6 py-6 sm:px-8">
      {project.readme.map((block, index) => (
        <Block block={block} key={`${block.type}-${index.toString()}`} project={project} />
      ))}
    </div>
  );
}

function Block({ block, project }: { block: ReadmeBlock; project: Project }) {
  switch (block.type) {
    case "hero":
      return (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          {block.logo && (
            // biome-ignore lint/performance/noImgElement: a static asset of the README, served as is.
            <img alt="" className="h-24 w-auto rounded-md" src={block.logo} />
          )}
          <h2 className="font-semibold text-2xl tracking-[-0.02em]">{block.title}</h2>
          <p className="text-muted-foreground">{block.tagline}</p>
          <p className="flex flex-wrap items-center justify-center gap-x-2 text-sm">
            {block.links.map((link, index) => (
              <span className="flex items-center gap-2" key={link.href}>
                {index > 0 && (
                  <span aria-hidden className="text-muted-foreground">
                    ·
                  </span>
                )}
                <Anchor href={link.href}>{link.label}</Anchor>
              </span>
            ))}
          </p>
        </div>
      );
    case "badges":
      return (
        <ul className="flex flex-wrap justify-center gap-1.5">
          {block.items.map((item) => (
            <li
              className="flex overflow-hidden rounded-sm border font-mono text-[11px]"
              key={item.label}
            >
              <span className="bg-muted px-1.5 py-0.5 text-muted-foreground">{item.label}</span>
              <span className="px-1.5 py-0.5">{item.value}</span>
            </li>
          ))}
        </ul>
      );
    case "heading":
      return block.level === 2 ? (
        <h2
          className="mt-2 border-b pb-1.5 font-semibold text-2xl tracking-[-0.02em]"
          id={slug(block.text)}
        >
          {block.text}
        </h2>
      ) : (
        <h3 className="mt-1 font-semibold text-xl tracking-[-0.01em]" id={slug(block.text)}>
          {block.text}
        </h3>
      );
    case "paragraph":
      return <p className="max-w-3xl leading-relaxed">{inline(block.text)}</p>;
    case "list":
      return (
        <ul className="flex max-w-3xl list-disc flex-col gap-1.5 ps-6 leading-relaxed">
          {block.items.map((item) => (
            <li key={item}>{inline(item)}</li>
          ))}
        </ul>
      );
    case "image":
      return (
        // biome-ignore lint/performance/noImgElement: a static asset of the README (an animated GIF), served as is.
        <img alt={block.alt} className="w-full rounded-lg border" loading="lazy" src={block.src} />
      );
    case "callout": {
      const Icon =
        block.kind === "warning"
          ? TriangleAlertIcon
          : block.kind === "tip"
            ? LightbulbIcon
            : InfoIcon;
      const label = block.kind === "warning" ? "Warning" : block.kind === "tip" ? "Tip" : "Note";
      return (
        <aside className="flex max-w-3xl flex-col gap-1.5 border-s-2 ps-4 text-sm">
          <span className="flex items-center gap-1.5 font-medium">
            <Icon aria-hidden className="size-4" />
            {label}
          </span>
          <p className="text-muted-foreground leading-relaxed">{inline(block.text)}</p>
        </aside>
      );
    }
    case "contributors":
      return (
        <div className="flex flex-col gap-2">
          <ul className="flex flex-wrap gap-1">
            {project.contributors.map((contributor) => (
              <li key={contributor.handle}>
                <Link
                  href={`/${contributor.handle}`}
                  title={`${contributor.handle} · ${number(contributor.prompts)} prompts to production`}
                >
                  <UserAvatar className="size-10" handle={contributor.handle} />
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground text-sm">
            + {number(project.contributorsCount - project.contributors.length)} more, counted by
            prompts to production.
          </p>
        </div>
      );
  }
}

function slug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function Anchor({ href, children }: { href: string; children: ReactNode }) {
  const className = "font-medium underline underline-offset-4 hover:text-foreground";
  return href.startsWith("/") || href.startsWith("#") ? (
    <Link className={className} href={href}>
      {children}
    </Link>
  ) : (
    <a className={className} href={href} rel="noreferrer">
      {children}
    </a>
  );
}

/** `**bold**` and `[text](href)`, nothing else. */
function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, index) => {
    const key = `${index.toString()}-${part.slice(0, 12)}`;
    const bold = /^\*\*([^*]+)\*\*$/.exec(part);
    if (bold?.[1]) return <strong key={key}>{bold[1]}</strong>;
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link?.[1] && link[2]) {
      return (
        <Anchor href={link[2]} key={key}>
          {link[1]}
        </Anchor>
      );
    }
    return part;
  });
}
