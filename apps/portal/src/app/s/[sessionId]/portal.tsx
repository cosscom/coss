"use client";

import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
import { Checkbox } from "@coss/ui/components/checkbox";
import { Input } from "@coss/ui/components/input";
import { Label } from "@coss/ui/components/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type EventType = {
  name: string;
  description: string | null;
  examples: Record<string, unknown>[];
};
type Endpoint = {
  id: string;
  url: string;
  description: string | null;
  filter_types: string[];
  enabled: boolean;
  disabled_reason: "manual" | "failing" | null;
  failing_since: string | null;
  created_at: string;
};
type Delivery = {
  id: string;
  message_id: string;
  status: "pending" | "succeeded" | "failed";
  attempt_count: number;
  last_status_code: number | null;
  last_error: string | null;
  next_attempt_at: string | null;
  created_at: string;
};
type Attempt = {
  id: string;
  attempted_at: string;
  status_code: number | null;
  duration_ms: number;
  error: string | null;
  response_excerpt: string | null;
};
type Message = {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
};
type Overview = {
  application: { id: string; uid: string | null; name: string };
  read_only: boolean;
  expires_at: string;
  branding: { display_name: string | null; accent_color: string | null; theme: string };
  event_types: EventType[];
  endpoints: Endpoint[];
};
type List<T> = { data: T[]; has_more: boolean };

class PortalApiError extends Error {}

const storageKey = (sessionId: string) => `coss-portal:${sessionId}`;

/**
 * The token arrives in the URL fragment (never sent to a server); it is moved to sessionStorage
 * (this tab only, survives a reload) and removed from the address bar.
 */
function takeToken(sessionId: string): string | null {
  const fromHash = window.location.hash.slice(1);
  if (fromHash.startsWith("cossp_")) {
    window.sessionStorage.setItem(storageKey(sessionId), fromHash);
    window.history.replaceState(null, "", window.location.pathname);
    return fromHash;
  }
  return window.sessionStorage.getItem(storageKey(sessionId));
}

function useApi(sessionId: string, token: string | null) {
  return useCallback(
    async <T,>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> => {
      const response = await fetch(`/api/sessions/${sessionId}${path}`, {
        method: init.method ?? "GET",
        headers: {
          Authorization: `Bearer ${token ?? ""}`,
          ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        cache: "no-store",
      });
      const json = (await response.json().catch(() => null)) as
        | (T & { error?: { message: string } })
        | null;
      if (!response.ok) {
        throw new PortalApiError(json?.error?.message ?? `Request failed (${response.status}).`);
      }
      return json as T;
    },
    [sessionId, token],
  );
}

function when(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "—";
}

function StatusBadge({ endpoint }: { endpoint: Endpoint }) {
  if (!endpoint.enabled) {
    return endpoint.disabled_reason === "failing" ? (
      <Badge variant="error">Disabled: failing</Badge>
    ) : (
      <Badge variant="secondary">Disabled</Badge>
    );
  }
  return endpoint.failing_since ? (
    <Badge variant="warning">Failing</Badge>
  ) : (
    <Badge variant="success">Enabled</Badge>
  );
}

const DELIVERY_BADGE = {
  pending: ["warning", "Pending"],
  succeeded: ["success", "Succeeded"],
  failed: ["error", "Failed"],
} as const;

function Secret({ value }: { value: string }) {
  return (
    <code className="block select-all break-all rounded-lg border bg-muted px-3 py-2 font-mono text-sm">
      {value}
    </code>
  );
}

export function Portal({ sessionId }: { sessionId: string }) {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  useEffect(() => setToken(takeToken(sessionId)), [sessionId]);
  const api = useApi(sessionId, token ?? null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [tab, setTab] = useState<"endpoints" | "messages" | "event-types">("endpoints");
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setOverview(await api<Overview>(""));
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "This portal link can't be opened.");
    }
  }, [api]);
  useEffect(() => {
    if (token === undefined) return;
    if (token === null) {
      setFailure("This portal link is incomplete. Open it again from the product you use.");
      return;
    }
    void load();
  }, [token, load]);

  // The customer's branding: theme and accent color.
  useEffect(() => {
    if (!overview) return;
    const { theme, accent_color } = overview.branding;
    const dark =
      theme === "dark" ||
      (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    if (accent_color) document.documentElement.style.setProperty("--primary", accent_color);
  }, [overview]);

  if (failure) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-2 p-6">
        <h1 className="font-semibold text-xl">This link can't be opened</h1>
        <p className="text-muted-foreground text-sm">{failure}</p>
      </main>
    );
  }
  if (!overview) {
    return <main className="p-6 text-muted-foreground text-sm">Loading…</main>;
  }

  const endpoint = overview.endpoints.find((row) => row.id === selected) ?? null;
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <p className="text-muted-foreground text-sm">
          {overview.branding.display_name ?? "Webhooks"}
        </p>
        <h1 className="font-semibold text-2xl">{overview.application.name}</h1>
        {overview.read_only ? (
          <p className="text-muted-foreground text-xs">Read-only: changes are turned off.</p>
        ) : null}
      </header>
      <nav aria-label="Sections" className="flex gap-2">
        {(
          [
            ["endpoints", "Endpoints"],
            ["messages", "Messages"],
            ["event-types", "Event types"],
          ] as const
        ).map(([value, label]) => (
          <Button
            aria-pressed={tab === value}
            key={value}
            onClick={() => {
              setTab(value);
              setSelected(null);
            }}
            size="sm"
            variant={tab === value ? "default" : "outline"}
          >
            {label}
          </Button>
        ))}
      </nav>
      {tab === "endpoints" && endpoint ? (
        <EndpointDetail
          api={api}
          endpoint={endpoint}
          eventTypes={overview.event_types}
          onBack={() => setSelected(null)}
          onChanged={load}
          readOnly={overview.read_only}
        />
      ) : null}
      {tab === "endpoints" && !endpoint ? (
        <Endpoints
          api={api}
          endpoints={overview.endpoints}
          eventTypes={overview.event_types}
          onChanged={load}
          onSelect={setSelected}
          readOnly={overview.read_only}
        />
      ) : null}
      {tab === "messages" ? <Messages api={api} /> : null}
      {tab === "event-types" ? <EventTypes eventTypes={overview.event_types} /> : null}
    </main>
  );
}

type Api = ReturnType<typeof useApi>;

function EventTypeChoices(props: { eventTypes: EventType[]; selected?: string[] }) {
  if (props.eventTypes.length === 0) return null;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 font-medium text-sm">Event types</legend>
      <p className="text-muted-foreground text-xs">
        Leave all unchecked to receive every type, including ones added later.
      </p>
      {props.eventTypes.map((type) => (
        <Label className="items-start gap-2" key={type.name}>
          <Checkbox
            defaultChecked={props.selected?.includes(type.name)}
            name="filterTypes"
            value={type.name}
          />
          <span className="flex flex-col">
            <span className="font-mono text-xs">{type.name}</span>
            {type.description ? (
              <span className="font-normal text-muted-foreground text-xs">{type.description}</span>
            ) : null}
          </span>
        </Label>
      ))}
    </fieldset>
  );
}

function Endpoints(props: {
  api: Api;
  endpoints: Endpoint[];
  eventTypes: EventType[];
  readOnly: boolean;
  onSelect: (id: string) => void;
  onChanged: () => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ secret: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const endpoint = await props.api<{ secret: string }>("/endpoints", {
        method: "POST",
        body: {
          url: String(form.get("url") ?? ""),
          description: String(form.get("description") ?? "") || null,
          filter_types: form.getAll("filterTypes").map(String),
        },
      });
      setCreated({ secret: endpoint.secret });
      setAdding(false);
      await props.onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't add the endpoint.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Endpoints</CardTitle>
        <CardDescription>
          URLs that receive these webhooks. Each request is signed with the endpoint's secret
          (Standard Webhooks headers <code>webhook-id</code>, <code>webhook-timestamp</code>,{" "}
          <code>webhook-signature</code>).
        </CardDescription>
      </CardHeader>
      <CardPanel className="flex flex-col gap-4">
        {created ? (
          <div className="flex flex-col gap-2 rounded-lg border p-3">
            <p className="font-medium text-sm">Endpoint added. Verify requests with this secret:</p>
            <Secret value={created.secret} />
            <div>
              <Button onClick={() => setCreated(null)} size="sm" variant="outline">
                Done
              </Button>
            </div>
          </div>
        ) : null}
        {props.endpoints.length === 0 ? (
          <p className="text-muted-foreground text-sm">No endpoints yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>URL</TableHead>
                <TableHead>Event types</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.endpoints.map((endpoint) => (
                <TableRow key={endpoint.id}>
                  <TableCell className="max-w-96">
                    <button
                      className="break-all text-left font-medium hover:underline"
                      onClick={() => props.onSelect(endpoint.id)}
                      type="button"
                    >
                      {endpoint.url}
                    </button>
                  </TableCell>
                  <TableCell className="whitespace-normal font-mono text-xs">
                    {endpoint.filter_types.length === 0 ? "All" : endpoint.filter_types.join(", ")}
                  </TableCell>
                  <TableCell>
                    <StatusBadge endpoint={endpoint} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {props.readOnly ? null : adding ? (
          <form className="flex flex-col gap-3 rounded-lg border p-3" onSubmit={submit}>
            <Label className="flex flex-col items-start gap-1">
              URL
              <Input name="url" placeholder="https://example.com/webhooks" required type="url" />
            </Label>
            <Label className="flex flex-col items-start gap-1">
              Description
              <Input maxLength={256} name="description" placeholder="Optional" />
            </Label>
            <EventTypeChoices eventTypes={props.eventTypes} />
            {error ? <p className="text-destructive-foreground text-sm">{error}</p> : null}
            <div className="flex gap-2">
              <Button loading={pending} type="submit">
                Add endpoint
              </Button>
              <Button onClick={() => setAdding(false)} type="button" variant="ghost">
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div>
            <Button onClick={() => setAdding(true)} size="sm">
              Add endpoint
            </Button>
          </div>
        )}
      </CardPanel>
    </Card>
  );
}

function EndpointDetail(props: {
  api: Api;
  endpoint: Endpoint;
  eventTypes: EventType[];
  readOnly: boolean;
  onBack: () => void;
  onChanged: () => Promise<void>;
}) {
  const { api, endpoint } = props;
  const base = `/endpoints/${endpoint.id}`;
  const [secret, setSecret] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<List<Delivery> | null>(null);
  const [attempts, setAttempts] = useState<Record<string, Attempt[]>>({});
  const [testType, setTestType] = useState(props.eventTypes[0]?.name ?? "");

  const loadDeliveries = useCallback(async () => {
    setDeliveries(await api<List<Delivery>>(`${base}/deliveries`));
  }, [api, base]);
  useEffect(() => {
    void loadDeliveries();
  }, [loadDeliveries]);

  async function run(label: string, action: () => Promise<unknown>) {
    setNotice(null);
    try {
      await action();
      setNotice(label);
      await Promise.all([props.onChanged(), loadDeliveries()]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button onClick={props.onBack} size="sm" variant="ghost">
          ← Endpoints
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="break-all">{endpoint.url}</CardTitle>
          <CardDescription>
            <StatusBadge endpoint={endpoint} />{" "}
            {endpoint.failing_since && endpoint.enabled
              ? `Failing since ${when(endpoint.failing_since)}: it is disabled after 5 days without a successful delivery.`
              : null}
            {endpoint.disabled_reason === "failing"
              ? "Disabled after failing for 5 days. Fix the receiver, enable it, then recover what it missed."
              : null}
          </CardDescription>
        </CardHeader>
        <CardPanel className="flex flex-col gap-4">
          <p className="font-mono text-xs">
            {endpoint.filter_types.length === 0
              ? "Receives every event type."
              : `Receives ${endpoint.filter_types.join(", ")}.`}
          </p>
          {notice ? <p className="text-sm">{notice}</p> : null}
          {secret ? <Secret value={secret} /> : null}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() =>
                api<{ secret: string }>(`${base}/secret`).then(
                  (result) => setSecret(result.secret),
                  (error: Error) => setNotice(error.message),
                )
              }
              size="sm"
              variant="outline"
            >
              Reveal secret
            </Button>
            {props.readOnly ? null : (
              <>
                <Button
                  onClick={() =>
                    run("Secret rolled: the old one keeps signing for 24 hours.", async () => {
                      const rolled = await api<{ secret: string }>(`${base}/roll_secret`, {
                        method: "POST",
                      });
                      setSecret(rolled.secret);
                    })
                  }
                  size="sm"
                  variant="outline"
                >
                  Roll secret
                </Button>
                <Button
                  onClick={() =>
                    run(endpoint.enabled ? "Endpoint disabled." : "Endpoint enabled.", () =>
                      api(base, { method: "PATCH", body: { enabled: !endpoint.enabled } }),
                    )
                  }
                  size="sm"
                  variant="outline"
                >
                  {endpoint.enabled ? "Disable" : "Enable"}
                </Button>
                {endpoint.enabled ? (
                  <Button
                    onClick={() =>
                      run("Recovering every failed delivery of the last 24 hours.", () =>
                        api(`${base}/recover`, {
                          method: "POST",
                          body: { since: new Date(Date.now() - 86_400_000).toISOString() },
                        }),
                      )
                    }
                    size="sm"
                    variant="outline"
                  >
                    Recover last 24 hours
                  </Button>
                ) : null}
                <Button
                  onClick={() => {
                    if (!window.confirm(`Delete ${endpoint.url}?`)) return;
                    void run("Endpoint deleted.", async () => {
                      await api(base, { method: "DELETE" });
                      props.onBack();
                    });
                  }}
                  size="sm"
                  variant="destructive-outline"
                >
                  Delete
                </Button>
              </>
            )}
          </div>
          {!props.readOnly && endpoint.enabled && props.eventTypes.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Event type"
                className="h-8 rounded-lg border bg-background px-2 font-mono text-xs"
                onChange={(event) => setTestType(event.target.value)}
                value={testType}
              >
                {props.eventTypes.map((type) => (
                  <option key={type.name} value={type.name}>
                    {type.name}
                  </option>
                ))}
              </select>
              <Button
                onClick={() =>
                  run("Test message sent.", () =>
                    api(`${base}/test`, { method: "POST", body: { event_type: testType } }),
                  )
                }
                size="sm"
                variant="outline"
              >
                Send test
              </Button>
            </div>
          ) : null}
        </CardPanel>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Deliveries</CardTitle>
          <CardDescription>
            Failed deliveries are retried for about a day. Any 2xx response counts as delivered.
          </CardDescription>
        </CardHeader>
        <CardPanel className="p-2">
          {!deliveries ? (
            <p className="p-4 text-muted-foreground text-sm">Loading…</p>
          ) : deliveries.data.length === 0 ? (
            <p className="p-4 text-muted-foreground text-sm">No deliveries yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Last result</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.data.map((delivery) => {
                  const [variant, label] = DELIVERY_BADGE[delivery.status];
                  const shown = attempts[delivery.id];
                  return (
                    <TableRow key={delivery.id}>
                      <TableCell className="align-top">
                        <div className="font-mono text-xs">{delivery.message_id}</div>
                        <div className="text-muted-foreground text-xs">
                          {when(delivery.created_at)}
                        </div>
                        {shown ? (
                          <ul className="mt-2 flex flex-col gap-1 text-xs">
                            {shown.map((attempt) => (
                              <li key={attempt.id}>
                                {when(attempt.attempted_at)} ·{" "}
                                {attempt.status_code
                                  ? `HTTP ${attempt.status_code}`
                                  : attempt.error}{" "}
                                · {attempt.duration_ms} ms
                                {attempt.response_excerpt ? (
                                  <code className="block break-all text-muted-foreground">
                                    {attempt.response_excerpt}
                                  </code>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant={variant}>{label}</Badge>
                      </TableCell>
                      <TableCell className="align-top">{delivery.attempt_count}</TableCell>
                      <TableCell className="max-w-64 whitespace-normal break-all align-top text-xs">
                        {delivery.last_status_code
                          ? `HTTP ${delivery.last_status_code}`
                          : (delivery.last_error ?? "—")}
                      </TableCell>
                      <TableCell className="text-right align-top">
                        <div className="flex justify-end gap-1">
                          <Button
                            onClick={() =>
                              api<List<Attempt>>(`/deliveries/${delivery.id}/attempts`).then(
                                (list) =>
                                  setAttempts((all) => ({ ...all, [delivery.id]: list.data })),
                                (error: Error) => setNotice(error.message),
                              )
                            }
                            size="xs"
                            variant="ghost"
                          >
                            Attempts
                          </Button>
                          {props.readOnly || delivery.status === "pending" ? null : (
                            <Button
                              onClick={() =>
                                run("Retry queued.", () =>
                                  api(`/deliveries/${delivery.id}/retry`, { method: "POST" }),
                                )
                              }
                              size="xs"
                              variant="outline"
                            >
                              Retry
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardPanel>
      </Card>
    </div>
  );
}

function Messages({ api }: { api: Api }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadMore = useCallback(
    async (after?: string) => {
      try {
        const page = await api<List<Message>>(
          `/messages${after ? `?${new URLSearchParams({ after })}` : ""}`,
        );
        setMessages((current) => (after ? [...current, ...page.data] : page.data));
        setHasMore(page.has_more);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Couldn't load messages.");
      }
    },
    [api],
  );
  useEffect(() => {
    void loadMore();
  }, [loadMore]);
  const last = useMemo(() => messages.at(-1)?.id, [messages]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Messages</CardTitle>
        <CardDescription>Everything sent to you in the last 30 days, newest first.</CardDescription>
      </CardHeader>
      <CardPanel className="flex flex-col gap-2">
        {error ? <p className="text-destructive-foreground text-sm">{error}</p> : null}
        {messages.length === 0 && !error ? (
          <p className="text-muted-foreground text-sm">No messages yet.</p>
        ) : null}
        {messages.map((message) => (
          <div className="rounded-lg border p-3" key={message.id}>
            <button
              className="flex w-full flex-wrap items-baseline justify-between gap-2 text-left"
              onClick={() => setOpen(open === message.id ? null : message.id)}
              type="button"
            >
              <span className="font-mono text-sm">{message.event_type}</span>
              <span className="text-muted-foreground text-xs">{when(message.created_at)}</span>
            </button>
            {open === message.id ? (
              <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs">
                {JSON.stringify(message.payload, null, 2)}
              </pre>
            ) : null}
          </div>
        ))}
        {hasMore && last ? (
          <div>
            <Button onClick={() => void loadMore(last)} size="sm" variant="outline">
              Load more
            </Button>
          </div>
        ) : null}
      </CardPanel>
    </Card>
  );
}

function EventTypes({ eventTypes }: { eventTypes: EventType[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Event types</CardTitle>
        <CardDescription>What can be sent to your endpoints.</CardDescription>
      </CardHeader>
      <CardPanel className="flex flex-col gap-3">
        {eventTypes.length === 0 ? (
          <p className="text-muted-foreground text-sm">No event types are listed.</p>
        ) : (
          eventTypes.map((type) => (
            <div className="flex flex-col gap-1 rounded-lg border p-3" key={type.name}>
              <span className="font-mono text-sm">{type.name}</span>
              {type.description ? (
                <span className="text-muted-foreground text-sm">{type.description}</span>
              ) : null}
              {type.examples[0] ? (
                <pre className="max-h-60 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs">
                  {JSON.stringify(type.examples[0], null, 2)}
                </pre>
              ) : null}
            </div>
          ))
        )}
      </CardPanel>
    </Card>
  );
}
