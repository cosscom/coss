import { Button } from "@coss/ui/components/button";
import { PlusIcon, RocketIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { About } from "@/components/project/about";
import { Readme } from "@/components/project/readme";
import { PromptList } from "@/components/prompt-list";
import { UserAvatar } from "@/components/user-avatar";
import { number, relative } from "@/lib/format";
import { getProject, getUser, listPromptRequests, OPEN_STATUSES } from "@/lib/store";

export default async function ProjectOverview({ params }: PageProps<"/[owner]/[project]">) {
  const { owner, project: slug } = await params;
  const project = getProject(owner, slug);
  if (!project) notFound();
  const base = `/${owner}/${slug}`;
  const shipped = listPromptRequests({ owner, project: slug, status: "in_production" });
  const latest = shipped[0];
  const open = listPromptRequests({ owner, project: slug, status: OPEN_STATUSES }).slice(0, 5);
  return (
    <main className="container grid w-full gap-8 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:px-6">
      <div className="flex min-w-0 flex-col gap-6">
        {/* GitHub's latest-commit bar, with the latest thing that reached production instead. */}
        {latest && (
          <div className="flex flex-col gap-2 rounded-lg border bg-sidebar/40 px-4 py-3 text-sm sm:flex-row sm:items-center sm:gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <UserAvatar className="size-5" handle={latest.author} />
              <Link className="shrink-0 font-medium hover:underline" href={`/${latest.author}`}>
                {getUser(latest.author)?.name ?? latest.author}
              </Link>
              <Link
                className="min-w-0 truncate text-muted-foreground hover:text-foreground max-sm:hidden"
                href={`${base}/prompts/${latest.number}`}
              >
                {latest.title}
              </Link>
            </div>
            <Link
              className="truncate text-muted-foreground hover:text-foreground sm:hidden"
              href={`${base}/prompts/${latest.number}`}
            >
              {latest.title}
            </Link>
            <span className="flex items-center justify-between gap-3 font-mono text-muted-foreground text-xs sm:ms-auto sm:justify-end">
              <span className="whitespace-nowrap">
                #{latest.number} · {relative(latest.updatedAt)}
              </span>
              <span className="flex items-center gap-1 whitespace-nowrap text-foreground">
                <RocketIcon aria-hidden className="size-3.5" />
                {number(project.promptsToProduction)} to production
              </span>
            </span>
          </div>
        )}
        <article className="rounded-lg border">
          <div className="flex items-center justify-between border-b px-4 py-2.5 text-sm">
            <span className="font-medium">README</span>
            <Button render={<Link href={`${base}/prompts/new`} />} size="xs" variant="outline">
              <PlusIcon aria-hidden />
              Prompt request
            </Button>
          </div>
          <Readme project={project} />
        </article>
        <section className="rounded-lg border">
          <div className="flex items-center justify-between border-b px-4 py-2.5 text-sm">
            <span className="font-medium">Open prompt requests</span>
            <Link className="text-muted-foreground hover:text-foreground" href={`${base}/prompts`}>
              All prompt requests
            </Link>
          </div>
          <PromptList items={open} />
        </section>
      </div>
      <About project={project} />
    </main>
  );
}
