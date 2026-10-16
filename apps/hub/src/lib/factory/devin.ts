/**
 * Devin (devin.ai) as the factory, through its REST API (v1, docs.devin.ai/api-reference):
 * `POST /sessions` per approved request, `GET /sessions/{id}` for its messages and status, and
 * `POST /sessions/{id}/message` when a maintainer replies to an update. The key is a personal
 * (`apk_user_…`) or service (`apk_…`) API key. `fetch` is injectable (tests).
 */
import type { Factory, FactoryState, FactoryUpdate } from "./types.ts";

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export type DevinClientOptions = {
  apiKey: string;
  baseUrl?: string;
  fetch?: FetchLike;
};

type DevinMessage = {
  event_id?: string;
  type?: string;
  message?: string;
  timestamp?: string;
  origin?: string;
  username?: string | null;
};

type DevinSession = {
  session_id: string;
  url?: string;
  status?: string;
  status_enum?: string;
  pull_request?: { url?: string } | null;
  structured_output?: Record<string, unknown> | null;
  messages?: DevinMessage[];
};

export class DevinApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "DevinApiError";
  }
}

export function devinStatus(
  session: Pick<DevinSession, "status_enum" | "status">,
): FactoryState["status"] {
  // `status_enum`: working, blocked, finished, expired, and the suspend/resume transitions.
  const raw = (session.status_enum ?? session.status ?? "").toLowerCase();
  if (raw.includes("finish") || raw.includes("complete")) return "finished";
  if (/expire|stop|fail|error/.test(raw)) return "failed";
  if (/block|suspend|sleep/.test(raw)) return "blocked";
  return "running";
}

/** Devin's own messages become thread updates; ours (and its tool chatter) don't. */
export function devinUpdates(session: DevinSession): FactoryUpdate[] {
  const updates: FactoryUpdate[] = [];
  (session.messages ?? []).forEach((message, index) => {
    const type = (message.type ?? "").toLowerCase();
    const origin = (message.origin ?? "").toLowerCase();
    const fromDevin = type === "devin_message" || origin === "devin";
    const text = message.message?.trim();
    if (!fromDevin || !text) return;
    updates.push({
      id: `${session.session_id}:${message.event_id ?? index}`,
      at: message.timestamp ? new Date(message.timestamp) : new Date(),
      text,
    });
  });
  return updates;
}

function previewUrl(output: DevinSession["structured_output"]): string | undefined {
  if (!output) return undefined;
  for (const key of ["preview_url", "previewUrl", "url"]) {
    const value = output[key];
    if (typeof value === "string" && value.startsWith("https://")) return value;
  }
  return undefined;
}

export function devinFactory(options: DevinClientOptions): Factory {
  const baseUrl = (options.baseUrl ?? "https://api.devin.ai/v1").replace(/\/$/, "");
  const call: FetchLike = options.fetch ?? fetch;
  const request = async <T>(path: string, init: RequestInit = {}, signal?: AbortSignal) => {
    const response = await call(`${baseUrl}${path}`, {
      ...init,
      signal,
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new DevinApiError(
        response.status,
        `Devin ${init.method ?? "GET"} ${path}: ${response.status} ${text.slice(0, 200)}`,
      );
    }
    return (await response.json()) as T;
  };
  return {
    name: "Devin",
    provider: "devin",
    async start(input, signal) {
      const session = await request<{ session_id: string; url?: string }>(
        "/sessions",
        {
          method: "POST",
          body: JSON.stringify({
            prompt: input.prompt,
            title: input.title,
            tags: input.tags,
            idempotent: false,
          }),
        },
        signal,
      );
      return {
        sessionId: session.session_id,
        sessionUrl: session.url ?? `https://app.devin.ai/sessions/${session.session_id}`,
      };
    },
    async poll(sessionId, signal) {
      const session = await request<DevinSession>(`/sessions/${sessionId}`, {}, signal);
      const status = devinStatus(session);
      const updates = devinUpdates(session);
      const pullRequest = session.pull_request?.url;
      if (status === "finished" && pullRequest) {
        updates.push({
          id: `${sessionId}:change`,
          at: new Date(),
          text: "The change is ready for production.",
          link: { label: "Change", href: pullRequest },
        });
      }
      return {
        status,
        updates,
        previewUrl: previewUrl(session.structured_output),
        productionUrl: pullRequest,
      };
    },
    async message(sessionId, text, signal) {
      await request(
        `/sessions/${sessionId}/message`,
        { method: "POST", body: JSON.stringify({ message: text }) },
        signal,
      );
    },
  };
}
