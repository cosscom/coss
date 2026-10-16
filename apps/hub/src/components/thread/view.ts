/** What the client-side thread receives: the request, serialized (dates as ISO strings). */
import type { ChangeKind, CommentKind, PromptStatus } from "@/lib/types";

export type PersonView = {
  handle: string;
  name: string;
  avatarUrl: string | null;
  initials: string;
  role?: "author" | "maintainer";
};

export type CommentView = {
  id: string;
  kind: CommentKind;
  author: string;
  body: string;
  parentId: string | null;
  createdAt: string;
  questions?: string[];
  link?: { label: string; href: string };
  reactions: { emoji: string; by: string[] }[];
};

export type ThreadView = {
  owner: string;
  project: string;
  number: number;
  title: string;
  author: string;
  body: string;
  attachments: { id: string; name: string; type: string; size: number }[];
  createdAt: string;
  status: PromptStatus;
  kind: ChangeKind;
  factoryName: string;
  /** The signed-in, onboarded viewer; `null` reads only. */
  viewer: string | null;
  maintainer: boolean;
  maintainers: string[];
  participants: string[];
  people: Record<string, PersonView>;
  comments: CommentView[];
  /** When each person last read the thread. */
  reads: Record<string, string>;
  /** The viewer's previous read, before this visit: what's after it is new to them. */
  lastReadBefore: string | null;
  build: {
    sessionUrl: string;
    previewUrl?: string;
    productionUrl?: string;
    progress: number | null;
  } | null;
  decision: { by: string; decision: "approved" | "declined"; comment: string; at: string } | null;
  triageModel: string | null;
};
