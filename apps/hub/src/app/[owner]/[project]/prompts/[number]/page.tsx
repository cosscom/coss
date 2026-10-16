import { ChatMemberSection } from "@coss/ui/components/chat/chat-members";
import { FactoryIcon, ShieldCheckIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { LiveRefresh } from "@/components/thread/live-refresh";
import { Thread } from "@/components/thread/thread";
import type { PersonView, ThreadView } from "@/components/thread/view";
import { UserAvatar } from "@/components/user-avatar";
import { avatarUrl, initials } from "@/lib/avatar";
import { FAKE_BUILD_MS } from "@/lib/factory/fake";
import { long, relative, tokens, usd } from "@/lib/format";
import { hubFactory, hubTriager } from "@/lib/runtime";
import { currentViewer } from "@/lib/session";
import {
  getProject,
  getPromptRequest,
  getUser,
  isMaintainer,
  markRead,
  participants,
} from "@/lib/store";
import { CHANGE_KIND_LABELS, STATUS_LABELS } from "@/lib/types";
import { syncBuild } from "@/lib/workflow";

export default async function PromptRequestPage({
  params,
}: PageProps<"/[owner]/[project]/prompts/[number]">) {
  const { owner, project: slug, number } = await params;
  const project = getProject(owner, slug);
  const pr = project && getPromptRequest(owner, slug, Number(number));
  if (!project || !pr) notFound();
  const factory = hubFactory();
  // The factory's progress since the last look lands in the thread as it is read.
  await syncBuild(pr, { factory, triager: hubTriager() });
  const viewer = await currentViewer();
  const user = viewer?.onboarded ? viewer.user : null;
  const maintainer = user ? isMaintainer(project, user.handle) : false;
  // Reading the thread is the read receipt; what came after the previous one is "new".
  const lastReadBefore = user ? markRead(pr, user.handle) : null;
  const people = participants(pr);
  const building = pr.status === "building";

  const handles = new Set([
    ...people,
    ...project.maintainers,
    ...(user ? [user.handle] : []),
    ...pr.comments.flatMap((c) => c.reactions.flatMap((r) => r.by)),
    ...Object.keys(pr.reads),
  ]);
  const views: Record<string, PersonView> = {};
  for (const handle of handles) {
    const u = getUser(handle);
    views[handle] = {
      handle,
      name: u?.name ?? handle,
      avatarUrl: u ? avatarUrl(u) : null,
      initials: initials(u?.name ?? handle),
      role:
        handle === pr.author
          ? "author"
          : project.maintainers.includes(handle)
            ? "maintainer"
            : undefined,
    };
  }
  const view: ThreadView = {
    owner,
    project: slug,
    number: pr.number,
    title: pr.title,
    author: pr.author,
    body: pr.body,
    attachments: pr.attachments,
    createdAt: pr.createdAt.toISOString(),
    status: pr.status,
    kind: pr.triage?.kind ?? "feature",
    factoryName: factory.name,
    viewer: user?.handle ?? null,
    maintainer,
    maintainers: project.maintainers,
    participants: people,
    people: views,
    comments: pr.comments.map((c) => ({
      id: c.id,
      kind: c.kind,
      author: c.author,
      body: c.body,
      parentId: c.parentId,
      createdAt: c.createdAt.toISOString(),
      questions: c.questions,
      link: c.link,
      reactions: c.reactions,
    })),
    reads: Object.fromEntries(Object.entries(pr.reads).map(([h, d]) => [h, d.toISOString()])),
    lastReadBefore: lastReadBefore?.toISOString() ?? null,
    build: pr.build
      ? {
          sessionUrl: pr.build.sessionUrl,
          previewUrl: pr.build.previewUrl,
          productionUrl: pr.build.productionUrl,
          progress:
            building && pr.build.provider === "fake"
              ? Math.min(
                  96,
                  Math.round(((Date.now() - pr.build.startedAt.getTime()) / FAKE_BUILD_MS) * 100),
                )
              : null,
        }
      : null,
    decision: pr.decision ? { ...pr.decision, at: pr.decision.at.toISOString() } : null,
    triageModel: pr.triage?.model ?? null,
  };

  const member = (handle: string, badge?: string) => ({
    id: handle,
    name: (
      <Link className="hover:underline" href={`/${handle}`}>
        {getUser(handle)?.name ?? handle}
      </Link>
    ),
    avatar: <UserAvatar className="size-6" handle={handle} />,
    badges: badge ? (
      <span className="rounded-full border px-1.5 font-mono text-[10px] uppercase">{badge}</span>
    ) : undefined,
  });

  return (
    <main className="container flex w-full flex-col gap-5 pt-6">
      {building && <LiveRefresh />}
      <header className="flex flex-col gap-2">
        <h1 className="font-semibold text-2xl tracking-[-0.02em] sm:text-3xl">
          {pr.title} <span className="font-normal text-muted-foreground">#{pr.number}</span>
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
          <StatusBadge size="lg" status={pr.status} />
          <span>
            <Link className="font-medium text-foreground hover:underline" href={`/${pr.author}`}>
              {getUser(pr.author)?.name ?? pr.author}
            </Link>{" "}
            opened this prompt request {relative(pr.createdAt)} ·{" "}
            {pr.comments.filter((c) => c.kind === "comment").length} comments
          </span>
        </div>
      </header>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Thread view={view} />
        <aside className="flex flex-col gap-5 pb-6 text-sm">
          <Spec label="Status">{STATUS_LABELS[pr.status]}</Spec>
          <Spec label="Kind">{CHANGE_KIND_LABELS[pr.triage?.kind ?? "feature"]}</Spec>
          {pr.decision && (
            <Spec label="Decision">
              {pr.decision.decision === "approved" ? "Approved" : "Declined"} by{" "}
              {pr.decision.by === "hub"
                ? "the project's rules"
                : (getUser(pr.decision.by)?.name ?? pr.decision.by)}
              <span className="block text-muted-foreground text-xs">{long(pr.decision.at)}</span>
            </Spec>
          )}
          {pr.build && (
            <Spec label="Factory">
              <span className="flex flex-col gap-1">
                <a
                  className="hover:underline"
                  href={pr.build.sessionUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {factory.name} session
                </a>
                {pr.build.previewUrl && (
                  <a
                    className="text-muted-foreground hover:underline"
                    href={pr.build.previewUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Preview
                  </a>
                )}
                {pr.build.productionUrl && (
                  <a
                    className="text-muted-foreground hover:underline"
                    href={pr.build.productionUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Production
                  </a>
                )}
                {pr.build.usage && (
                  <span className="pt-1 font-mono text-muted-foreground text-xs">
                    {tokens(pr.build.usage.inputTokens + pr.build.usage.outputTokens)} tokens ·{" "}
                    {usd(pr.build.usage.costUsd)}
                  </span>
                )}
              </span>
            </Spec>
          )}
          <ChatMemberSection
            heading={
              <>
                <UsersIcon aria-hidden className="size-3.5" /> Participants
              </>
            }
            label="Participants"
            members={people.map((handle) =>
              member(handle, handle === pr.author ? "author" : undefined),
            )}
          />
          <ChatMemberSection
            heading={
              <>
                <ShieldCheckIcon aria-hidden className="size-3.5" /> Maintainers
              </>
            }
            label="Maintainers"
            members={project.maintainers.map((handle) =>
              member(handle, pr.decision?.by === handle ? "decided" : undefined),
            )}
          />
          <ChatMemberSection
            heading={
              <>
                <FactoryIcon aria-hidden className="size-3.5" /> Factory
              </>
            }
            label="Factory"
            members={[
              {
                id: "factory",
                name: factory.name,
                badges: (
                  <span className="text-muted-foreground text-xs">
                    {pr.build ? (building ? "working" : pr.build.status) : "idle"}
                  </span>
                ),
              },
            ]}
          />
        </aside>
      </div>
    </main>
  );
}

function Spec({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 border-b pb-4">
      <span className="font-semibold text-muted-foreground text-xs">{label}</span>
      <div>{children}</div>
    </div>
  );
}
