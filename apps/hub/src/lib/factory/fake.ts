/**
 * A factory that plays a build through in about half a minute, deterministically from the
 * session's start time (no timers: polling computes what has happened so far). The session id
 * carries the request's number and the start, so a restarted process keeps the story straight.
 */
import type { Factory, FactoryState, FactoryUpdate } from "./types.ts";

type Stage = {
  afterMs: number;
  text: (n: string) => string;
  link?: (n: string) => FactoryUpdate["link"];
};

const STAGES: Stage[] = [
  {
    afterMs: 4_000,
    text: (n) => `Started working on #${n}. Reading the pages involved and the tests around them.`,
    link: () => ({ label: "Session", href: "https://factory.hub.coss.test/sessions/live" }),
  },
  {
    afterMs: 13_000,
    text: () => "Wrote the change and tests for it. Running the end-to-end suite.",
  },
  {
    afterMs: 22_000,
    text: () => "All end-to-end tests pass, plus 3 new ones. Deploying a preview.",
  },
  {
    afterMs: 30_000,
    text: (n) => `#${n} is built, tested and deployed to a preview. Everyone can try it now.`,
    link: (n) => ({ label: "Preview", href: `https://preview-${n}.cal.com` }),
  },
];

export const FAKE_BUILD_MS = STAGES[STAGES.length - 1]?.afterMs ?? 0;

/** A build burns about this many tokens a second, at a blended $4 per million. */
const TOKENS_PER_MS = 60;
const USD_PER_TOKEN = 4 / 1_000_000;

export function fakeUsage(elapsedMs: number) {
  const total = Math.round(Math.min(elapsedMs, FAKE_BUILD_MS) * TOKENS_PER_MS);
  const outputTokens = Math.round(total * 0.18);
  return {
    inputTokens: total - outputTokens,
    outputTokens,
    costUsd: Math.round(total * USD_PER_TOKEN * 100) / 100,
  };
}

export function parseFakeSession(sessionId: string): { number: string; startedAt: number } | null {
  const match = /^fake_([^_]+)_(\d+)$/.exec(sessionId);
  if (!match?.[1] || !match[2]) return null;
  return { number: match[1], startedAt: Number(match[2]) };
}

export function fakeFactory(options: { now?: () => Date; name?: string } = {}): Factory {
  const now = options.now ?? (() => new Date());
  return {
    name: options.name ?? "Devin",
    provider: "fake",
    async start(input) {
      const number =
        /#(\d+)/.exec(input.title)?.[1] ?? input.tags.find((tag) => /^\d+$/.test(tag)) ?? "0";
      const sessionId = `fake_${number}_${now().getTime()}`;
      return { sessionId, sessionUrl: `https://factory.hub.coss.test/sessions/${sessionId}` };
    },
    async poll(sessionId): Promise<FactoryState> {
      const session = parseFakeSession(sessionId);
      if (!session) return { status: "failed", updates: [] };
      const elapsed = now().getTime() - session.startedAt;
      const updates = STAGES.filter((stage) => elapsed >= stage.afterMs).map((stage, index) => ({
        id: `${sessionId}:${index}`,
        at: new Date(session.startedAt + stage.afterMs),
        text: stage.text(session.number),
        link: stage.link?.(session.number),
      }));
      const finished = elapsed >= FAKE_BUILD_MS;
      return {
        status: finished ? "finished" : "running",
        updates,
        previewUrl: finished ? `https://preview-${session.number}.cal.com` : undefined,
        productionUrl: finished ? "https://app.cal.com" : undefined,
        usage: fakeUsage(elapsed),
      };
    },
    async message() {
      // The fake has nobody to tell.
    },
  };
}
