import { Badge } from "@coss/ui/components/badge";
import { Progress, ProgressIndicator, ProgressTrack } from "@coss/ui/components/progress";
import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FactoryLogo } from "@/components/factory-logo";
import { PromptList } from "@/components/prompt-list";
import { StatusBadge } from "@/components/status-badge";
import { LiveRefresh } from "@/components/thread/live-refresh";
import { UserAvatar } from "@/components/user-avatar";
import { FAKE_BUILD_MS } from "@/lib/factory/fake";
import { number, relative, tokens, usd } from "@/lib/format";
import { hubFactory, hubTriager } from "@/lib/runtime";
import { getProject, getUser, listPromptRequests } from "@/lib/store";
import { CHANGE_KIND_LABELS } from "@/lib/types";
import { syncBuild } from "@/lib/workflow";

const FACTORY_SITES: Record<string, string> = {
  Devin: "devin.ai",
  Shipyard: "coss.com/shipyard",
};

/** The project's factory: what it runs on, what it is working on right now, what it did. */
export default async function FactoryPage({ params }: PageProps<"/[owner]/[project]/factory">) {
  const { owner, project: slug } = await params;
  const project = getProject(owner, slug);
  if (!project) notFound();
  const factory = hubFactory();
  const deps = { factory, triager: hubTriager() };
  const building = listPromptRequests({ owner, project: slug, status: "building" });
  for (const pr of building) await syncBuild(pr, deps);
  const working = listPromptRequests({ owner, project: slug, status: "building" });
  const queued = listPromptRequests({
    owner,
    project: slug,
    status: ["approved", "awaiting_review"],
  });
  const shipped = listPromptRequests({ owner, project: slug, status: "in_production" }).slice(0, 8);
  const failed = listPromptRequests({ owner, project: slug, status: "failed" }).length;
  const total = shipped.length + failed;
  const base = `/${owner}/${slug}`;
  const site = FACTORY_SITES[project.factory];
  return (
    <main className="container flex w-full flex-col gap-6 py-6">
      {working.length > 0 && <LiveRefresh />}
      <section className="grid gap-px overflow-hidden rounded-lg border bg-border lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <div className="flex items-center gap-4 bg-background px-4 py-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg border bg-foreground text-background">
            <FactoryLogo className="size-6" name={project.factory} />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-muted-foreground text-xs">Runs on</span>
            <span className="font-semibold text-xl tracking-[-0.02em]">{project.factory}</span>
            <span className="font-mono text-muted-foreground text-xs">
              {site ?? factory.provider}
              {factory.provider === "fake" && " · simulated in this prototype"}
            </span>
          </div>
        </div>
        <Stat
          label="Working on now"
          value={String(working.length)}
          hint={working.length === 1 ? "build" : "builds"}
        />
        <Stat
          label="Waiting"
          value={String(queued.length)}
          hint="approved or awaiting a maintainer"
        />
        <Stat
          label="Ships"
          value={total ? `${Math.round((shipped.length / total) * 100)}%` : "–"}
          hint={`${number(project.promptsToProduction)} to production, all time`}
        />
      </section>

      <section className="rounded-lg border">
        <h2 className="border-b px-4 py-2.5 font-medium text-sm">Working on now</h2>
        {working.length === 0 ? (
          <p className="px-4 py-10 text-center text-muted-foreground text-sm">
            {project.factory} is idle. Approve a prompt request and it starts within seconds.
          </p>
        ) : (
          <ul className="divide-y">
            {working.map((pr) => {
              const build = pr.build;
              const updates = pr.comments.filter((c) => c.kind === "factory");
              const latest = updates.at(-1);
              const progress =
                build?.provider === "fake"
                  ? Math.min(
                      96,
                      Math.round(((Date.now() - build.startedAt.getTime()) / FAKE_BUILD_MS) * 100),
                    )
                  : null;
              return (
                <li className="flex flex-col gap-3 px-4 py-4" key={pr.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={pr.status} />
                    <Link
                      className="font-semibold hover:underline"
                      href={`${base}/prompts/${pr.number}`}
                    >
                      {pr.title}
                    </Link>
                    <span className="text-muted-foreground text-sm">#{pr.number}</span>
                    <Badge className="px-1.5 font-mono text-[10px]" variant="outline">
                      {CHANGE_KIND_LABELS[pr.triage?.kind ?? "feature"]}
                    </Badge>
                    <span className="ms-auto flex items-center gap-3 font-mono text-muted-foreground text-xs">
                      {build && <span>started {relative(build.startedAt)}</span>}
                      {build?.usage && (
                        <span>
                          {tokens(build.usage.inputTokens + build.usage.outputTokens)} ·{" "}
                          {usd(build.usage.costUsd)}
                        </span>
                      )}
                      {build && (
                        <a
                          className="flex items-center gap-1 text-foreground hover:underline"
                          href={build.sessionUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Session <ExternalLinkIcon aria-hidden className="size-3" />
                        </a>
                      )}
                    </span>
                  </div>
                  {progress !== null && (
                    <Progress value={progress}>
                      <ProgressTrack className="h-1 bg-foreground/10">
                        <ProgressIndicator className="bg-foreground" />
                      </ProgressTrack>
                    </Progress>
                  )}
                  <div className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                      <FactoryLogo className="size-3" name={project.factory} />
                    </span>
                    <p className="text-muted-foreground">
                      {latest ? latest.body : `${project.factory} is reading the brief…`}
                      {latest && (
                        <span className="ms-2 font-mono text-xs">{relative(latest.createdAt)}</span>
                      )}
                    </p>
                  </div>
                  <p className="flex items-center gap-2 text-muted-foreground text-xs">
                    <UserAvatar className="size-4" handle={pr.author} />
                    opened by {getUser(pr.author)?.name ?? pr.author}
                    {pr.decision && pr.decision.by !== "hub" && (
                      <>
                        <span>·</span>
                        <UserAvatar className="size-4" handle={pr.decision.by} />
                        approved by {getUser(pr.decision.by)?.name ?? pr.decision.by}
                      </>
                    )}
                    {pr.decision?.by === "hub" && <span>· auto-allowed</span>}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border">
          <h2 className="border-b px-4 py-2.5 font-medium text-sm">Up next</h2>
          <PromptList items={queued} />
        </section>
        <section className="rounded-lg border">
          <h2 className="border-b px-4 py-2.5 font-medium text-sm">Rules</h2>
          <dl className="flex flex-col px-4 py-2 text-sm">
            <Row
              label="Auto-allowed"
              value={project.autoAllow.map((kind) => CHANGE_KIND_LABELS[kind]).join(", ")}
            />
            <Row
              label="Needs a maintainer"
              value="Features, fixes, design, anything touching auth, billing or data"
            />
            <Row
              label="Every build"
              value="End-to-end tests, a preview for everyone, a production link in the thread"
            />
            <Row
              label="Steering"
              value="Maintainers reply under a factory update; it is forwarded to the session"
            />
          </dl>
        </section>
      </div>

      <section className="rounded-lg border">
        <h2 className="border-b px-4 py-2.5 font-medium text-sm">Recently shipped</h2>
        <PromptList items={shipped} />
      </section>
    </main>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 bg-background px-4 py-4">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-semibold text-2xl tracking-[-0.02em]">{value}</span>
      {hint && <span className="font-mono text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b py-2.5 last:border-b-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
