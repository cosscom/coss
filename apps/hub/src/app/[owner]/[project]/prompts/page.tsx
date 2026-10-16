import { Button } from "@coss/ui/components/button";
import { cn } from "@coss/ui/lib/utils";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PromptList } from "@/components/prompt-list";
import { getProject, listPromptRequests, OPEN_STATUSES } from "@/lib/store";
import { PROMPT_STATUSES, type PromptStatus, STATUS_LABELS } from "@/lib/types";

const FILTERS = [
  { key: "open", label: "Open", statuses: OPEN_STATUSES },
  { key: "awaiting_review", label: "Awaiting review", statuses: ["awaiting_review"] },
  { key: "in_production", label: "In production", statuses: ["in_production"] },
  { key: "declined", label: "Declined", statuses: ["declined", "failed"] },
  { key: "all", label: "All", statuses: [...PROMPT_STATUSES] },
] as const satisfies readonly { key: string; label: string; statuses: readonly PromptStatus[] }[];

export default async function PromptRequests({
  params,
  searchParams,
}: PageProps<"/[owner]/[project]/prompts">) {
  const { owner, project: slug } = await params;
  const { filter } = await searchParams;
  const project = getProject(owner, slug);
  if (!project) notFound();
  const current = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const items = listPromptRequests({ owner, project: slug, status: [...current.statuses] });
  const base = `/${owner}/${slug}/prompts`;
  return (
    <main className="container flex w-full flex-col gap-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          A Prompt Request is a change described in English. {STATUS_LABELS.awaiting_review} ones
          wait for a maintainer; {project.autoAllow.join(", ")} changes go straight to{" "}
          {project.factory}.
        </p>
        <Button render={<Link href={`${base}/new`} />} size="sm">
          <PlusIcon aria-hidden />
          New prompt request
        </Button>
      </div>
      <section className="rounded-lg border">
        <nav
          aria-label="Filter"
          className="flex flex-wrap gap-1 border-b bg-sidebar/40 px-3 py-2 text-sm"
        >
          {FILTERS.map((f) => {
            const count = listPromptRequests({
              owner,
              project: slug,
              status: [...f.statuses],
            }).length;
            return (
              <Link
                aria-current={f === current ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 hover:bg-muted",
                  f === current ? "font-medium text-foreground" : "text-muted-foreground",
                )}
                href={f.key === "open" ? base : `${base}?filter=${f.key}`}
                key={f.key}
              >
                {f.label}
                <span className="font-mono text-xs">{count}</span>
              </Link>
            );
          })}
        </nav>
        <PromptList items={items} />
      </section>
    </main>
  );
}
