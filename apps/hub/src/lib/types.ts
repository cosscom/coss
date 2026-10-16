/** The hub's domain, as the in-memory prototype store holds it (src/lib/store.ts). */

export type User = {
  handle: string;
  name: string;
  /** The Better Auth user behind a real account (seeded people have none). */
  accountId?: string;
  /** A GitHub handle whose avatar is shown (`https://avatars.githubusercontent.com/<handle>`). */
  githubHandle?: string;
  /** Else a portrait (Unsplash) for people who aren't on GitHub. */
  avatarUrl?: string;
  bio?: string;
  company?: string;
  location?: string;
  website?: string;
  followers: number;
  following: number;
  joinedAt: Date;
};

export type Organization = {
  slug: string;
  name: string;
  githubHandle?: string;
  description?: string;
  website?: string;
  location?: string;
  members: string[];
};

export type Release = { tag: string; name: string; publishedAt: Date };

export type Project = {
  owner: string;
  slug: string;
  name: string;
  description: string;
  website?: string;
  topics: string[];
  stars: number;
  watchers: number;
  /** Lifetime count of Prompt Requests that reached production. */
  promptsToProduction: number;
  contributorsCount: number;
  releasesCount: number;
  latestRelease: Release;
  maintainers: string[];
  /** Contributors shown in the sidebar, with their prompts shipped. */
  contributors: { handle: string; prompts: number }[];
  readme: ReadmeBlock[];
  /** Kinds of change that skip the maintainers and go straight to the factory. */
  autoAllow: ChangeKind[];
  factory: string;
  /** Lifetime, across every prompt the factory built for this project. */
  factoryUsage: FactoryUsage;
  createdAt: Date;
};

/**
 * A README without code: prose with **bold** and [links](url), headings, lists, images, callouts
 * and the project's own numbers. No code blocks, no file trees, on purpose.
 */
export type ReadmeBlock =
  | {
      type: "hero";
      logo?: string;
      title: string;
      tagline: string;
      links: { label: string; href: string }[];
    }
  | { type: "badges"; items: { label: string; value: string }[] }
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "image"; src: string; alt: string }
  | { type: "callout"; kind: "note" | "tip" | "warning"; text: string }
  | { type: "contributors" };

export const CHANGE_KINDS = [
  "copy",
  "translation",
  "accessibility",
  "dependency",
  "feature",
  "fix",
  "design",
] as const;
export type ChangeKind = (typeof CHANGE_KINDS)[number];

export const PROMPT_STATUSES = [
  "needs_context",
  "awaiting_review",
  "approved",
  "building",
  "in_production",
  "declined",
  "failed",
] as const;
export type PromptStatus = (typeof PROMPT_STATUSES)[number];

export type CommentKind =
  /** A person wrote it. */
  | "comment"
  /** The hub's triage: what the author still has to tell. */
  | "triage"
  /** The maintainers' decision (an approval card's result). */
  | "decision"
  /** An update from the software factory. */
  | "factory"
  /** A one-line event (sent to the factory, shipped, …). */
  | "system";

export type Comment = {
  id: string;
  kind: CommentKind;
  /** A user's handle; `hub` and `factory` for the hub's own and the factory's messages. */
  author: string;
  body: string;
  parentId: string | null;
  createdAt: Date;
  /** Triage: the questions the author still has to answer. */
  questions?: string[];
  /** Factory: a link the update carries (session, preview, production). */
  link?: { label: string; href: string };
  /** Emoji reactions: who reacted with what. */
  reactions: { emoji: string; by: string[] }[];
};

export type Triage = {
  ready: boolean;
  kind: ChangeKind;
  questions: string[];
  model: string;
  at: Date;
};

export type Decision = {
  by: string;
  decision: "approved" | "declined";
  comment: string;
  at: Date;
};

/** What a build cost: the factory's tokens and the money they came to. */
export type FactoryUsage = {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

export type Build = {
  provider: string;
  sessionId: string;
  sessionUrl: string;
  startedAt: Date;
  finishedAt: Date | null;
  status: "running" | "blocked" | "finished" | "failed";
  /** Ids of the factory's updates already copied into the thread. */
  seenUpdates: string[];
  previewUrl?: string;
  productionUrl?: string;
  usage?: FactoryUsage;
};

/** A file sent with a request (a screenshot, a recording, a PDF); its bytes live in the store. */
export type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
};

export type PromptRequest = {
  id: string;
  owner: string;
  project: string;
  number: number;
  title: string;
  body: string;
  author: string;
  status: PromptStatus;
  createdAt: Date;
  updatedAt: Date;
  triage: Triage | null;
  decision: Decision | null;
  build: Build | null;
  comments: Comment[];
  /** When each person last read the thread (read receipts). */
  reads: Record<string, Date>;
  attachments: Attachment[];
};

export const STATUS_LABELS: Record<PromptStatus, string> = {
  needs_context: "Needs context",
  awaiting_review: "Awaiting review",
  approved: "Approved",
  building: "Building",
  in_production: "In production",
  declined: "Declined",
  failed: "Failed",
};

export const CHANGE_KIND_LABELS: Record<ChangeKind, string> = {
  copy: "Copy",
  translation: "Translation",
  accessibility: "Accessibility",
  dependency: "Dependency update",
  feature: "Feature",
  fix: "Fix",
  design: "Design",
};
