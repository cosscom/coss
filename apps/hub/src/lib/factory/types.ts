/** A software factory: takes an approved Prompt Request, reports back, ships. */

export type FactoryUpdate = {
  /** Stable per session, so an update is copied into the thread once. */
  id: string;
  at: Date;
  text: string;
  link?: { label: string; href: string };
};

export type FactoryState = {
  status: "running" | "blocked" | "finished" | "failed";
  updates: FactoryUpdate[];
  previewUrl?: string;
  productionUrl?: string;
  /** Tokens burned so far and what they cost, when the factory reports it. */
  usage?: { inputTokens: number; outputTokens: number; costUsd: number };
};

export type FactoryStart = {
  /** The full brief: the request, the author's follow-ups and the maintainer's comment. */
  prompt: string;
  title: string;
  tags: string[];
};

export type Factory = {
  /** Shown in the thread ("Sent to Devin"). */
  name: string;
  /** Stored on the build. */
  provider: string;
  start(
    input: FactoryStart,
    signal?: AbortSignal,
  ): Promise<{ sessionId: string; sessionUrl: string }>;
  poll(sessionId: string, signal?: AbortSignal): Promise<FactoryState>;
  /** A maintainer's reply under a factory update goes back to the session. */
  message(sessionId: string, text: string, signal?: AbortSignal): Promise<void>;
};
