/**
 * The prototype's store: everything in memory, seeded once per process (kept on `globalThis` so
 * `next dev`'s module reloads don't reset it). Reads return the live objects; mutate only through
 * the functions here so `updatedAt` and ids stay right. Moving this to Postgres is a matter of
 * giving each function a table.
 */
import { seed } from "./seed.ts";
import type {
  Attachment,
  Comment,
  Organization,
  Project,
  PromptRequest,
  PromptStatus,
  User,
} from "./types.ts";

/** Bump when the seed's shape changes: a store kept across module reloads is rebuilt. */
const SEED_VERSION = 9;

type HubStore = {
  version: number;
  users: Map<string, User>;
  organizations: Map<string, Organization>;
  projects: Map<string, Project>;
  promptRequests: Map<string, PromptRequest>;
  counters: Map<string, number>;
  commentIds: number;
  /** Per actor: the projects they starred / watch (`owner/slug`). */
  stars: Map<string, Set<string>>;
  watches: Map<string, Set<string>>;
  /** Uploaded files by id (served by `/attachments/<id>`). */
  attachments: Map<string, { bytes: Uint8Array; type: string; name: string }>;
};

declare global {
  var __hubStore: HubStore | undefined;
}

export const projectKey = (owner: string, slug: string) => `${owner}/${slug}`;

function build(): HubStore {
  const data = seed();
  return {
    version: SEED_VERSION,
    users: new Map(data.users.map((user) => [user.handle, user])),
    organizations: new Map(data.organizations.map((org) => [org.slug, org])),
    projects: new Map(
      data.projects.map((project) => [projectKey(project.owner, project.slug), project]),
    ),
    promptRequests: new Map(data.promptRequests.map((pr) => [pr.id, pr])),
    counters: data.counters,
    commentIds: data.commentIds,
    attachments: new Map(),
    stars: new Map([["peerrich", new Set(["calcom/cal.com", "cosscom/coss"])]]),
    watches: new Map([
      ["peerrich", new Set(["calcom/cal.com", "calcom/platform", "cosscom/coss"])],
    ]),
  };
}

export function store(): HubStore {
  if (globalThis.__hubStore?.version !== SEED_VERSION) globalThis.__hubStore = build();
  return globalThis.__hubStore;
}

/** Tests: a fresh store. */
export function resetStore(): void {
  globalThis.__hubStore = build();
}

// Reads

export function getUser(handle: string): User | null {
  return store().users.get(handle) ?? null;
}

/** A signed-in account mirrored into the store, so threads and profiles can resolve it. */
export function upsertUser(user: User): User {
  store().users.set(user.handle, user);
  return user;
}

export function listUsers(): User[] {
  return [...store().users.values()];
}

export function getOrganization(slug: string): Organization | null {
  return store().organizations.get(slug) ?? null;
}

export function getProject(owner: string, slug: string): Project | null {
  return store().projects.get(projectKey(owner, slug)) ?? null;
}

export function listProjects(owner?: string): Project[] {
  const all = [...store().projects.values()];
  return (owner ? all.filter((project) => project.owner === owner) : all).sort(
    (a, b) => b.stars - a.stars,
  );
}

const byUpdated = (a: PromptRequest, b: PromptRequest) =>
  b.updatedAt.getTime() - a.updatedAt.getTime();

export function listPromptRequests(filter: {
  owner?: string;
  project?: string;
  author?: string;
  status?: PromptStatus | PromptStatus[];
}): PromptRequest[] {
  const statuses = filter.status
    ? new Set(Array.isArray(filter.status) ? filter.status : [filter.status])
    : null;
  return [...store().promptRequests.values()]
    .filter(
      (pr) =>
        (!filter.owner || pr.owner === filter.owner) &&
        (!filter.project || pr.project === filter.project) &&
        (!filter.author || pr.author === filter.author) &&
        (!statuses || statuses.has(pr.status)),
    )
    .sort(byUpdated);
}

export function getPromptRequest(
  owner: string,
  project: string,
  number: number,
): PromptRequest | null {
  const pr = store().promptRequests.get(`pr_${owner}_${number}`);
  return pr && pr.project === project ? pr : null;
}

/** Open = not decided yet or still being built: what GitHub counts in the tab's badge. */
export const OPEN_STATUSES: PromptStatus[] = [
  "needs_context",
  "awaiting_review",
  "approved",
  "building",
];

export function countOpen(owner: string, project: string): number {
  return listPromptRequests({ owner, project, status: OPEN_STATUSES }).length;
}

export function isMaintainer(project: Project, handle: string): boolean {
  return project.maintainers.includes(handle);
}

export function hasStarred(handle: string, project: Project): boolean {
  return store().stars.get(handle)?.has(projectKey(project.owner, project.slug)) ?? false;
}

export function isWatching(handle: string, project: Project): boolean {
  return store().watches.get(handle)?.has(projectKey(project.owner, project.slug)) ?? false;
}

// Writes

export function toggleStar(handle: string, project: Project): boolean {
  return toggle(store().stars, handle, project, "stars");
}

export function toggleWatch(handle: string, project: Project): boolean {
  return toggle(store().watches, handle, project, "watchers");
}

function toggle(
  map: Map<string, Set<string>>,
  handle: string,
  project: Project,
  counter: "stars" | "watchers",
): boolean {
  const key = projectKey(project.owner, project.slug);
  const set = map.get(handle) ?? new Set<string>();
  map.set(handle, set);
  if (set.has(key)) {
    set.delete(key);
    project[counter] -= 1;
    return false;
  }
  set.add(key);
  project[counter] += 1;
  return true;
}

export function storeAttachment(file: {
  name: string;
  type: string;
  bytes: Uint8Array;
}): Attachment {
  const s = store();
  const id = `att_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  s.attachments.set(id, { bytes: file.bytes, type: file.type, name: file.name });
  return { id, name: file.name, type: file.type, size: file.bytes.byteLength };
}

export function getAttachment(id: string) {
  return store().attachments.get(id) ?? null;
}

export function createPromptRequest(input: {
  owner: string;
  project: string;
  author: string;
  title: string;
  body: string;
  attachments?: Attachment[];
  now?: Date;
}): PromptRequest {
  const s = store();
  const key = projectKey(input.owner, input.project);
  const number = (s.counters.get(key) ?? 0) + 1;
  s.counters.set(key, number);
  const now = input.now ?? new Date();
  const pr: PromptRequest = {
    id: `pr_${input.owner}_${number}`,
    owner: input.owner,
    project: input.project,
    number,
    title: input.title.trim(),
    body: input.body.trim(),
    author: input.author,
    status: "needs_context",
    createdAt: now,
    updatedAt: now,
    triage: null,
    decision: null,
    build: null,
    comments: [],
    reads: { [input.author]: now },
    attachments: input.attachments ?? [],
  };
  s.promptRequests.set(pr.id, pr);
  return pr;
}

export function addComment(
  pr: PromptRequest,
  input: Omit<Comment, "id" | "createdAt" | "parentId" | "reactions"> & {
    parentId?: string | null;
    now?: Date;
  },
): Comment {
  const s = store();
  const comment: Comment = {
    id: `c_${++s.commentIds}`,
    kind: input.kind,
    author: input.author,
    body: input.body,
    parentId: input.parentId ?? null,
    createdAt: input.now ?? new Date(),
    questions: input.questions,
    link: input.link,
    reactions: [],
  };
  pr.comments.push(comment);
  pr.updatedAt = comment.createdAt;
  return comment;
}

export function setStatus(pr: PromptRequest, status: PromptStatus, now = new Date()): void {
  pr.status = status;
  pr.updatedAt = now;
}

/** Adds or removes the person's reaction; returns whether it is now on. */
export function toggleReaction(comment: Comment, handle: string, emoji: string): boolean {
  const existing = comment.reactions.find((r) => r.emoji === emoji);
  if (existing?.by.includes(handle)) {
    existing.by = existing.by.filter((h) => h !== handle);
    if (existing.by.length === 0)
      comment.reactions = comment.reactions.filter((r) => r !== existing);
    return false;
  }
  if (existing) existing.by.push(handle);
  else comment.reactions.push({ emoji, by: [handle] });
  return true;
}

/** Records that the person has read the thread up to now; returns when they last had. */
export function markRead(pr: PromptRequest, handle: string, now = new Date()): Date | null {
  const previous = pr.reads[handle] ?? null;
  pr.reads[handle] = now;
  return previous;
}

export function getComment(pr: PromptRequest, id: string): Comment | null {
  return pr.comments.find((comment) => comment.id === id) ?? null;
}

/** The root of a comment's thread (replies nest under one top-level comment). */
export function rootOf(pr: PromptRequest, comment: Comment): Comment {
  let current = comment;
  while (current.parentId) {
    const parent = getComment(pr, current.parentId);
    if (!parent) break;
    current = parent;
  }
  return current;
}

/** Everyone who wrote in the thread, author first, the hub and the factory left out. */
export function participants(pr: PromptRequest): string[] {
  const seen = new Set<string>([pr.author]);
  for (const comment of pr.comments) {
    if (comment.author !== "hub" && comment.author !== "factory") seen.add(comment.author);
  }
  return [...seen];
}
