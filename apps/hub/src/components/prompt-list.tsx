import { MessageSquareIcon } from "lucide-react";
import Link from "next/link";
import { relative } from "@/lib/format";
import { getUser } from "@/lib/store";
import { type PromptRequest, STATUS_LABELS } from "@/lib/types";
import { StatusIcon } from "./status-badge";
import { UserAvatar } from "./user-avatar";

/** GitHub's pull request rows, for Prompt Requests. */
export function PromptList({
  items,
  showProject = false,
}: {
  items: PromptRequest[];
  showProject?: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className="px-4 py-12 text-center text-muted-foreground text-sm">
        No prompt requests here.
      </p>
    );
  }
  return (
    <ul className="divide-y">
      {items.map((pr) => {
        const comments = pr.comments.filter(
          (c) => c.kind === "comment" || c.kind === "factory",
        ).length;
        const author = getUser(pr.author);
        const verb =
          pr.status === "in_production"
            ? "shipped"
            : pr.status === "declined"
              ? "declined"
              : pr.status === "building"
                ? "building since"
                : "opened";
        return (
          <li className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40" key={pr.id}>
            <StatusIcon className="mt-0.5 size-4 shrink-0" status={pr.status} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {showProject && (
                  <Link
                    className="text-muted-foreground text-sm hover:text-foreground"
                    href={`/${pr.owner}/${pr.project}`}
                  >
                    {pr.owner}/{pr.project}
                  </Link>
                )}
                <Link
                  className="font-semibold hover:underline"
                  href={`/${pr.owner}/${pr.project}/prompts/${pr.number}`}
                >
                  {pr.title}
                </Link>
                {pr.triage && pr.triage.kind !== "feature" && (
                  <span className="rounded-full border px-2 py-px font-mono text-[11px] text-muted-foreground">
                    {pr.triage.kind}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-muted-foreground text-xs">
                #{pr.number} {verb} {relative(pr.updatedAt)} by{" "}
                <Link className="hover:text-foreground" href={`/${pr.author}`}>
                  {author?.name ?? pr.author}
                </Link>
                {" · "}
                {STATUS_LABELS[pr.status]}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3 text-muted-foreground text-xs">
              <UserAvatar className="size-5" handle={pr.author} />
              {comments > 0 && (
                <span className="flex items-center gap-1">
                  <MessageSquareIcon aria-hidden className="size-3.5" />
                  {comments}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
