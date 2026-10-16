/**
 * What happens to a Prompt Request: triage on open (and on every answer while context is
 * missing), the maintainers' decision or the project's auto-allow rules, the build, and the
 * factory's updates copied into the thread. Pure over the store: the factory and the triage
 * are passed in (the runtime's in the app, fakes in tests).
 */
import type { Factory } from "./factory/types.ts";
import {
  addComment,
  createPromptRequest,
  getComment,
  getProject,
  isMaintainer,
  rootOf,
  setStatus,
} from "./store.ts";
import type { Triager } from "./triage.ts";
import {
  type Attachment,
  CHANGE_KIND_LABELS,
  type Comment,
  type Project,
  type PromptRequest,
  type Triage,
} from "./types.ts";

export type Deps = { factory: Factory; triager: Triager; now?: () => Date };

export class HubError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HubError";
  }
}

function projectOf(pr: PromptRequest): Project {
  const project = getProject(pr.owner, pr.project);
  if (!project) throw new HubError("Project not found.");
  return project;
}

/** The author's own words so far: the request, then what they answered in the thread. */
function followUps(pr: PromptRequest): string[] {
  return pr.comments
    .filter((comment) => comment.kind === "comment" && comment.author === pr.author)
    .map((comment) => comment.body);
}

async function runTriage(pr: PromptRequest, deps: Deps): Promise<Triage> {
  const project = projectOf(pr);
  const triage = await deps.triager.triage({
    project: { name: project.name, description: project.description },
    title: pr.title,
    body: pr.body,
    followUps: followUps(pr),
  });
  pr.triage = triage;
  return triage;
}

/** After triage: ask the author, auto-allow, or hand the request to the maintainers. */
async function applyTriage(pr: PromptRequest, triage: Triage, deps: Deps, asked: number) {
  const now = deps.now?.() ?? new Date();
  const project = projectOf(pr);
  if (!triage.ready) {
    setStatus(pr, "needs_context", now);
    addComment(pr, {
      kind: "triage",
      author: "hub",
      body:
        asked === 0
          ? `Thanks @${pr.author}. Before a maintainer looks at this, the factory needs a bit more to go on. Reply here with:`
          : triage.questions.length === 1
            ? "Nearly there. One more thing and this can go to a maintainer:"
            : "Got it. A couple more things and this can go to a maintainer:",
      questions: triage.questions,
      now,
    });
    return;
  }
  const kind = CHANGE_KIND_LABELS[triage.kind];
  if (project.autoAllow.includes(triage.kind)) {
    pr.decision = {
      by: "hub",
      decision: "approved",
      comment: `Auto-allowed: ${kind.toLowerCase()}.`,
      at: now,
    };
    setStatus(pr, "approved", now);
    await startBuild(pr, deps, `${kind}: auto-allowed by ${project.name}'s rules`);
    return;
  }
  setStatus(pr, "awaiting_review", now);
  addComment(pr, {
    kind: "system",
    author: "hub",
    body: `${kind} · ready for a maintainer's review`,
    now,
  });
}

export async function openPromptRequest(
  input: {
    owner: string;
    project: string;
    author: string;
    title: string;
    body: string;
    attachments?: Attachment[];
  },
  deps: Deps,
): Promise<PromptRequest> {
  if (!input.title.trim()) throw new HubError("Give the request a title.");
  if (!input.body.trim()) throw new HubError("Describe the change.");
  const pr = createPromptRequest({ ...input, now: deps.now?.() });
  const triage = await runTriage(pr, deps);
  await applyTriage(pr, triage, deps, 0);
  return pr;
}

/**
 * A comment in the thread. The author answering while context is missing re-runs triage; a
 * reply under a factory update while the factory works is forwarded to it.
 */
export async function comment(
  pr: PromptRequest,
  input: { author: string; body: string; parentId?: string | null },
  deps: Deps,
): Promise<Comment> {
  const body = input.body.trim();
  if (!body) throw new HubError("Write something first.");
  const parent = input.parentId ? getComment(pr, input.parentId) : null;
  if (input.parentId && !parent) throw new HubError("That comment is gone.");
  const now = deps.now?.() ?? new Date();
  const added = addComment(pr, {
    kind: "comment",
    author: input.author,
    body,
    parentId: parent?.id,
    now,
  });

  if (pr.status === "needs_context" && input.author === pr.author) {
    const asked = pr.comments.filter((c) => c.kind === "triage").length;
    const triage = await runTriage(pr, deps);
    await applyTriage(pr, triage, deps, asked);
  } else if (
    parent &&
    pr.build &&
    pr.status === "building" &&
    rootOf(pr, parent).kind === "factory" &&
    isMaintainer(projectOf(pr), input.author)
  ) {
    await deps.factory.message(pr.build.sessionId, `${input.author} (maintainer): ${body}`);
    addComment(pr, {
      kind: "system",
      author: "hub",
      body: `Forwarded to ${deps.factory.name}`,
      parentId: added.id,
      now,
    });
  }
  return added;
}

export async function decide(
  pr: PromptRequest,
  input: { by: string; decision: "approved" | "declined"; comment: string },
  deps: Deps,
): Promise<void> {
  const project = projectOf(pr);
  if (!isMaintainer(project, input.by)) throw new HubError("Only maintainers decide.");
  if (pr.status !== "awaiting_review") throw new HubError("This request has already been decided.");
  const text = input.comment.trim();
  if (!text) throw new HubError("Add a comment. Required either way.");
  const now = deps.now?.() ?? new Date();
  pr.decision = { by: input.by, decision: input.decision, comment: text, at: now };
  addComment(pr, { kind: "decision", author: input.by, body: text, now });
  if (input.decision === "declined") {
    setStatus(pr, "declined", now);
    return;
  }
  setStatus(pr, "approved", now);
  await startBuild(pr, deps);
}

function brief(pr: PromptRequest, project: Project): string {
  const lines = [
    `Project: ${project.owner}/${project.slug} (${project.description})`,
    `Prompt Request #${pr.number}: ${pr.title}`,
    "",
    pr.body,
  ];
  const answers = followUps(pr);
  if (answers.length > 0) lines.push("", "The author added:", ...answers.map((a) => `- ${a}`));
  if (pr.attachments.length > 0) {
    const base = (process.env.HUB_PUBLIC_URL ?? "http://localhost:3004").replace(/\/$/, "");
    lines.push(
      "",
      "Attached by the author:",
      ...pr.attachments.map((a) => `- ${a.name} (${a.type}): ${base}/attachments/${a.id}`),
    );
  }
  if (pr.decision && pr.decision.by !== "hub") {
    lines.push("", `Maintainer's note (${pr.decision.by}): ${pr.decision.comment}`);
  }
  lines.push(
    "",
    "Build it, run the end-to-end tests, deploy a preview, and report back with a short summary and the preview URL.",
  );
  return lines.join("\n");
}

async function startBuild(pr: PromptRequest, deps: Deps, note?: string): Promise<void> {
  const project = projectOf(pr);
  const now = deps.now?.() ?? new Date();
  try {
    const session = await deps.factory.start({
      prompt: brief(pr, project),
      title: `#${pr.number} ${pr.title}`,
      tags: [`${pr.owner}/${pr.project}`, String(pr.number)],
    });
    pr.build = {
      provider: deps.factory.provider,
      sessionId: session.sessionId,
      sessionUrl: session.sessionUrl,
      startedAt: now,
      finishedAt: null,
      status: "running",
      seenUpdates: [],
    };
    setStatus(pr, "building", now);
    addComment(pr, {
      kind: "system",
      author: "hub",
      body: note ? `${note}, sent to ${deps.factory.name}` : `Sent to ${deps.factory.name}`,
      link: { label: "Session", href: session.sessionUrl },
      now,
    });
  } catch (error) {
    console.error(`[hub] factory start failed for #${pr.number}:`, error);
    setStatus(pr, "failed", now);
    addComment(pr, {
      kind: "system",
      author: "hub",
      body: `${deps.factory.name} did not accept the request. A maintainer can try again.`,
      now,
    });
  }
}

/** Copies what the factory did since the last look into the thread; called when the thread is read. */
export async function syncBuild(pr: PromptRequest, deps: Deps): Promise<boolean> {
  if (!pr.build || pr.status !== "building") return false;
  let state: Awaited<ReturnType<Factory["poll"]>>;
  try {
    state = await deps.factory.poll(pr.build.sessionId);
  } catch (error) {
    console.error(`[hub] factory poll failed for #${pr.number}:`, error);
    return false;
  }
  let changed = false;
  const seen = new Set(pr.build.seenUpdates);
  for (const update of state.updates) {
    if (seen.has(update.id)) continue;
    seen.add(update.id);
    addComment(pr, {
      kind: "factory",
      author: "factory",
      body: update.text,
      link: update.link,
      now: update.at,
    });
    changed = true;
  }
  pr.build.seenUpdates = [...seen];
  pr.build.previewUrl = state.previewUrl ?? pr.build.previewUrl;
  pr.build.productionUrl = state.productionUrl ?? pr.build.productionUrl;
  if (state.usage) {
    changed ||=
      state.usage.inputTokens + state.usage.outputTokens !==
      (pr.build.usage?.inputTokens ?? 0) + (pr.build.usage?.outputTokens ?? 0);
    pr.build.usage = state.usage;
  }
  const now = deps.now?.() ?? new Date();
  if (state.status === "finished") {
    pr.build.status = "finished";
    pr.build.finishedAt = now;
    if (pr.build.usage) {
      const project = projectOf(pr);
      project.factoryUsage.inputTokens += pr.build.usage.inputTokens;
      project.factoryUsage.outputTokens += pr.build.usage.outputTokens;
      project.factoryUsage.costUsd += pr.build.usage.costUsd;
      project.promptsToProduction += 1;
    }
    setStatus(pr, "in_production", now);
    addComment(pr, {
      kind: "system",
      author: "hub",
      body: "In production",
      link: pr.build.productionUrl ? { label: "Open", href: pr.build.productionUrl } : undefined,
      now,
    });
    changed = true;
  } else if (state.status === "failed") {
    pr.build.status = "failed";
    pr.build.finishedAt = now;
    setStatus(pr, "failed", now);
    addComment(pr, {
      kind: "system",
      author: "hub",
      body: `${deps.factory.name} stopped without shipping.`,
      now,
    });
    changed = true;
  } else if (state.status !== pr.build.status) {
    pr.build.status = state.status;
    changed = true;
  }
  return changed;
}
