"use client";

import type { SigningView } from "@coss/sign";
import { Alert, AlertDescription, AlertTitle } from "@coss/ui/components/alert";
import { Button } from "@coss/ui/components/button";
import { Checkbox } from "@coss/ui/components/checkbox";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@coss/ui/components/dialog";
import { Label } from "@coss/ui/components/label";
import { Spinner } from "@coss/ui/components/spinner";
import { Textarea } from "@coss/ui/components/textarea";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PdfPages } from "@/components/pdf-pages";
import { postToHost, reportHeight } from "@/lib/embed";
import { SignatureDialog, type SignatureKind } from "./signature-dialog";

type Field = SigningView["fields"][number];
type ApiError = { code: string; message: string; param?: string | null };

class SigningError extends Error {
  constructor(
    readonly status: number,
    readonly detail: ApiError,
  ) {
    super(detail.message);
  }
}

/** The session token: from the URL fragment the first time, then from this tab's storage. */
function readToken(sessionId: string): string | null {
  const key = `coss-sign:${sessionId}`;
  const fromHash = window.location.hash.slice(1);
  if (fromHash.startsWith("cosss_")) {
    try {
      sessionStorage.setItem(key, fromHash);
    } catch {
      // Storage blocked (a third-party iframe in some browsers): the fragment stays the source.
      return fromHash;
    }
    // Out of the address bar, history and anything that reads `location`.
    window.history.replaceState(null, "", window.location.pathname);
    return fromHash;
  }
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function useSigningApi(sessionId: string) {
  const token = useRef<string | null>(null);
  const call = useCallback(
    async (path: string, init?: { method?: string; body?: unknown }) => {
      if (token.current === null) token.current = readToken(sessionId);
      const response = await fetch(`/api/sessions/${sessionId}${path}`, {
        method: init?.method ?? "GET",
        headers: {
          Authorization: `Bearer ${token.current ?? ""}`,
          ...(init?.body ? { "Content-Type": "application/json" } : {}),
        },
        body: init?.body ? JSON.stringify(init.body) : undefined,
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: ApiError } | null;
        throw new SigningError(
          response.status,
          payload?.error ?? { code: "unknown", message: "Something went wrong." },
        );
      }
      return response;
    },
    [sessionId],
  );
  return call;
}

/** Today's date as coss.com records it on the document (UTC). */
function displayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function Signing({ sessionId }: { sessionId: string }) {
  const call = useSigningApi(sessionId);
  const [view, setView] = useState<SigningView | null>(null);
  const [failure, setFailure] = useState<ApiError | null>(null);

  useEffect(() => reportHeight(), []);

  useEffect(() => {
    call("")
      .then((response) => response.json() as Promise<SigningView>)
      .then((loaded) => {
        setView(loaded);
        postToHost({ type: "ready", request_id: loaded.request.id, signer_id: loaded.signer.id });
      })
      .catch((error: unknown) => {
        const detail =
          error instanceof SigningError
            ? error.detail
            : { code: "network_error", message: "Couldn't reach the server. Try again." };
        setFailure(detail);
        postToHost({ type: "error", code: detail.code, message: detail.message });
      });
  }, [call]);

  // The customer's branding: theme and accent color.
  useEffect(() => {
    if (!view) return;
    const { theme, accent_color } = view.branding;
    const dark =
      theme === "dark" ||
      (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    if (accent_color) document.documentElement.style.setProperty("--primary", accent_color);
  }, [view]);

  if (failure) {
    return (
      <Centered>
        <h1 className="font-semibold text-xl">This link can't be used</h1>
        <p className="text-muted-foreground text-sm">{failure.message}</p>
        <p className="text-muted-foreground text-sm">Ask whoever sent it for a new one.</p>
      </Centered>
    );
  }
  if (!view) {
    return (
      <Centered>
        <Spinner />
      </Centered>
    );
  }
  return <Request call={call} onView={setView} view={view} />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    // Capped: in an iframe sized to its content, 60vh would keep the height it had before.
    <main className="mx-auto flex min-h-[min(60vh,28rem)] max-w-md flex-col items-center justify-center gap-2 p-6 text-center">
      {children}
    </main>
  );
}

function Request({
  view,
  onView,
  call,
}: {
  view: SigningView;
  onView: (view: SigningView) => void;
  call: ReturnType<typeof useSigningApi>;
}) {
  const { request, signer } = view;
  if (signer.status === "signed") {
    const ended: Record<string, string> = {
      declined: "Someone else declined to sign it, so it won't be completed.",
      canceled: `${view.requester.name} canceled it.`,
      expired: "It expired before everyone signed.",
    };
    return (
      <Centered>
        <h1 className="font-semibold text-xl">You signed {request.title}</h1>
        <p className="text-muted-foreground text-sm">
          {request.status === "completed"
            ? "Everyone has signed."
            : (ended[request.status] ??
              "We'll let the others know. You can download a copy here once everyone has signed.")}
        </p>
        {request.status === "completed" && <SignedCopy call={call} onView={onView} view={view} />}
        {request.status === "sent" && <AwaitOthers call={call} onView={onView} />}
      </Centered>
    );
  }
  if (signer.status === "declined") {
    return (
      <Centered>
        <h1 className="font-semibold text-xl">You declined to sign {request.title}</h1>
        <p className="text-muted-foreground text-sm">
          {view.requester.name} has been told. Nothing else is needed from you.
        </p>
      </Centered>
    );
  }
  // Past its deadline, a request is expired even before the worker marks it so.
  const status =
    request.status === "sent" && request.expires_at && new Date(request.expires_at) <= new Date()
      ? "expired"
      : request.status;
  if (status !== "sent") {
    const why: Record<string, string> = {
      completed: "Everyone has already signed it.",
      declined: "Someone declined to sign it.",
      canceled: `${view.requester.name} canceled it.`,
      expired: "It has expired.",
      draft: "It hasn't been sent yet.",
    };
    return (
      <Centered>
        <h1 className="font-semibold text-xl">{request.title} can't be signed</h1>
        <p className="text-muted-foreground text-sm">{why[status] ?? ""}</p>
      </Centered>
    );
  }
  if (!signer.consented) return <Consent call={call} onView={onView} view={view} />;
  return <Documents call={call} onView={onView} view={view} />;
}

/** The sealed copy: downloadable once the worker sealed it (seconds after the last signature). */
/** Asks again until the request leaves `sent` (everyone signed, or it ended), backing off. */
function AwaitOthers({
  onView,
  call,
}: {
  onView: (view: SigningView) => void;
  call: ReturnType<typeof useSigningApi>;
}) {
  useEffect(() => {
    let delay = 5000;
    let timer: ReturnType<typeof setTimeout>;
    // Gone (unmounted, or the effect rerun): an answer still in flight schedules nothing more.
    let stopped = false;
    const poll = () => {
      if (stopped) return;
      timer = setTimeout(() => {
        call("")
          .then((response) => response.json() as Promise<SigningView>)
          .then((next) => {
            if (stopped) return;
            if (next.request.status !== "sent") onView(next);
            else poll();
          })
          .catch(() => poll());
        delay = Math.min(delay * 1.5, 60_000);
      }, delay);
    };
    poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [call, onView]);
  return null;
}

function SignedCopy({
  view,
  onView,
  call,
}: {
  view: SigningView;
  onView: (view: SigningView) => void;
  call: ReturnType<typeof useSigningApi>;
}) {
  const ready = view.request.signed_document_ready;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ask again until it is sealed: every 3 seconds at first, backing off to every 30 (a seal that
  // failed once is retried a minute or more later).
  useEffect(() => {
    if (ready) return;
    let delay = 3000;
    let timer: ReturnType<typeof setTimeout>;
    // Gone (unmounted, or the effect rerun): an answer still in flight schedules nothing more.
    let stopped = false;
    const poll = () => {
      if (stopped) return;
      timer = setTimeout(() => {
        call("")
          .then((response) => response.json() as Promise<SigningView>)
          .then((next) => {
            if (stopped) return;
            if (next.request.signed_document_ready) onView(next);
            else poll();
          })
          .catch(() => poll());
        delay = Math.min(delay * 1.5, 30_000);
      }, delay);
    };
    poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [ready, call, onView]);

  const download = async () => {
    setPending(true);
    setError(null);
    try {
      const response = await call("/signed_document");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `${view.request.title} (signed).pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't download it.");
    } finally {
      setPending(false);
    }
  };

  if (!ready) {
    return (
      <p className="flex items-center gap-2 text-muted-foreground text-sm">
        <Spinner /> Preparing your signed copy…
      </p>
    );
  }
  return (
    <div className="flex flex-col items-center gap-2 pt-2">
      <Button loading={pending} onClick={download}>
        Download signed copy
      </Button>
      {error && <p className="text-destructive-foreground text-sm">{error}</p>}
    </div>
  );
}

function Consent({
  view,
  onView,
  call,
}: {
  view: SigningView;
  onView: (view: SigningView) => void;
  call: ReturnType<typeof useSigningApi>;
}) {
  const [agreed, setAgreed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);

  const agree = async () => {
    setPending(true);
    setError(null);
    try {
      const response = await call("/consent", {
        method: "POST",
        body: { disclosure_sha256: view.disclosure.sha256 },
      });
      onView((await response.json()) as SigningView);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-4 sm:p-8">
      <Header view={view} />
      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Agree to sign electronically</h2>
        <div className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed">
          {view.disclosure.text}
        </div>
        <Label className="flex items-start gap-2 font-normal">
          <Checkbox checked={agreed} onCheckedChange={(checked) => setAgreed(checked === true)} />
          <span>I have read this and agree to use electronic records and signatures.</span>
        </Label>
        {error && <p className="text-destructive-foreground text-sm">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button disabled={!agreed || view.read_only} loading={pending} onClick={agree}>
            Continue
          </Button>
          <Button onClick={() => setDeclining(true)} variant="ghost">
            Decline to sign
          </Button>
        </div>
      </section>
      <DeclineDialog
        call={call}
        onOpenChange={setDeclining}
        onView={onView}
        open={declining}
        view={view}
      />
    </main>
  );
}

function Header({ view }: { view: SigningView }) {
  return (
    <header className="flex flex-col gap-1">
      <p className="text-muted-foreground text-sm">
        {view.requester.name} asks {view.signer.name} to sign
      </p>
      <h1 className="font-heading font-semibold text-2xl">{view.request.title}</h1>
      {view.request.message && (
        <p className="whitespace-pre-wrap text-muted-foreground text-sm">{view.request.message}</p>
      )}
      {view.sandbox && (
        <Alert className="mt-3" variant="warning">
          <AlertTitle>Test request</AlertTitle>
          <AlertDescription>
            This comes from a sandbox environment: signing it has no legal effect.
          </AlertDescription>
        </Alert>
      )}
      {view.read_only && (
        <Alert className="mt-3" variant="error">
          <AlertTitle>Signing is paused</AlertTitle>
          <AlertDescription>
            {view.requester.name}'s account can't take signatures right now. Try again later.
          </AlertDescription>
        </Alert>
      )}
    </header>
  );
}

type Values = Record<string, string | boolean>;

function isFilled(field: Field, values: Values, images: Partial<Record<SignatureKind, string>>) {
  if (field.prefilled) return true;
  switch (field.type) {
    case "signature":
      return Boolean(images.signature);
    case "initials":
      return Boolean(images.initials);
    case "text":
      return typeof values[field.id] === "string" && (values[field.id] as string).trim() !== "";
    case "checkbox":
      return values[field.id] === true;
    default:
      return true;
  }
}

function Documents({
  view,
  onView,
  call,
}: {
  view: SigningView;
  onView: (view: SigningView) => void;
  call: ReturnType<typeof useSigningApi>;
}) {
  const [files, setFiles] = useState<Record<string, ArrayBuffer>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  // Whether pdf.js could open each document, and the download attempt ("Try again" bumps it).
  const [rendered, setRendered] = useState<Record<string, "ready" | "failed">>({});
  const [attempt, setAttempt] = useState(0);
  const [values, setValues] = useState<Values>({});
  const [images, setImages] = useState<Partial<Record<SignatureKind, string>>>({});
  const [adopting, setAdopting] = useState<SignatureKind | null>(null);
  const [declining, setDeclining] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fieldRefs = useRef(new Map<string, HTMLElement>());
  const viewedSent = useRef(false);

  // The documents load once: a refreshed view (below) has the same ones.
  const documentIds = view.documents.map((document) => document.id).join(",");
  useEffect(() => {
    let canceled = false;
    void attempt;
    Promise.all(
      documentIds.split(",").map(async (id) => {
        const response = await call(`/documents/${id}`);
        return [id, await response.arrayBuffer()] as const;
      }),
    )
      .then((loaded) => {
        if (canceled) return;
        setFiles(Object.fromEntries(loaded));
        if (!viewedSent.current) {
          viewedSent.current = true;
          postToHost({ type: "viewed", request_id: view.request.id, signer_id: view.signer.id });
        }
      })
      .catch((caught: unknown) => {
        if (!canceled) {
          setLoadError(caught instanceof Error ? caught.message : "Couldn't load the documents.");
        }
      });
    return () => {
      canceled = true;
    };
  }, [call, documentIds, view.request.id, view.signer.id, attempt]);
  const retryDocuments = () => {
    setLoadError(null);
    setFiles({});
    setRendered({});
    setAttempt((current) => current + 1);
  };
  // Nothing is signed unseen: every document must have loaded and opened.
  const shown = documentIds.split(",").every((id) => rendered[id] === "ready");
  const unshowable = loadError !== null || Object.values(rendered).includes("failed");

  // Sequential order: ask again until it's this signer's turn (what they filled in stays).
  const waiting = view.waiting_for.length > 0;
  useEffect(() => {
    if (!waiting) return;
    // A late answer (after signing, declining or leaving) must not bring back an older view.
    let stopped = false;
    const timer = setInterval(() => {
      call("")
        .then((response) => response.json() as Promise<SigningView>)
        .then((next) => {
          if (stopped) return;
          if (next.waiting_for.length === 0 || next.request.status !== "sent") onView(next);
        })
        .catch(() => {});
    }, 5000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [waiting, call, onView]);

  const required = useMemo(() => view.fields.filter((field) => field.required), [view.fields]);
  const missing = required.filter((field) => !isFilled(field, values, images));
  const canSign = view.can_sign && shown;
  // Declining doesn't wait for anyone: a signer waiting their turn can still decline.
  const canDecline = !view.read_only;

  const goToNext = () => {
    const next = missing[0];
    if (!next) return;
    const element = fieldRefs.current.get(next.id);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (next.type === "signature" || next.type === "initials") setAdopting(next.type);
    else element?.focus();
  };

  const finish = async () => {
    if (!images.signature) {
      setAdopting("signature");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await call("/sign", {
        method: "POST",
        body: { values, signature: images.signature, initials: images.initials ?? null },
      });
      const next = (await response.json()) as SigningView;
      postToHost({
        type: "signed",
        request_id: next.request.id,
        signer_id: next.signer.id,
        request_status: next.request.status === "completed" ? "completed" : "sent",
      });
      onView(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  };

  const overlay = (documentId: string) => (page: number, scale: number) =>
    view.fields
      .filter((field) => field.document_id === documentId && field.page === page)
      .map((field) => (
        <FieldBox
          disabled={!canSign}
          field={field}
          images={images}
          key={field.id}
          name={view.signer.name}
          email={view.signer.email}
          onAdopt={setAdopting}
          onValue={(value) => setValues((current) => ({ ...current, [field.id]: value }))}
          refCallback={(element) => {
            if (element) fieldRefs.current.set(field.id, element);
            else fieldRefs.current.delete(field.id);
          }}
          scale={scale}
          value={values[field.id]}
        />
      ));

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <Header view={view} />
      {view.waiting_for.length > 0 && (
        <Alert variant="info">
          <AlertTitle>Not your turn yet</AlertTitle>
          <AlertDescription>
            {view.waiting_for.map((other) => other.name).join(", ")}{" "}
            {view.waiting_for.length === 1 ? "has" : "have"} to sign first. You can read the
            documents in the meantime.
          </AlertDescription>
        </Alert>
      )}
      {unshowable && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-destructive-foreground text-sm">
            {loadError ?? "A document couldn't be shown."} You can sign once every document shows.
          </p>
          <Button onClick={retryDocuments} size="sm" variant="outline">
            Try again
          </Button>
        </div>
      )}
      {view.documents.map((document) => {
        const bytes = files[document.id];
        return (
          <section className="flex flex-col gap-3" key={document.id}>
            {view.documents.length > 1 && <h2 className="font-medium">{document.filename}</h2>}
            {bytes ? (
              <PdfPages
                bytes={bytes}
                onStatus={(status) =>
                  setRendered((current) => ({ ...current, [document.id]: status }))
                }
                overlay={overlay(document.id)}
                pages={document.pages}
              />
            ) : (
              !loadError && (
                <div className="flex h-64 items-center justify-center rounded-md border">
                  <Spinner />
                </div>
              )
            )}
          </section>
        );
      })}
      {(canSign || canDecline) && (
        <footer className="sticky bottom-0 flex flex-col gap-3 border-t bg-background/95 py-4 backdrop-blur">
          {canSign && (
            <p className="text-muted-foreground text-xs">
              By selecting Finish, you agree that your electronic signature is the legal equivalent
              of your handwritten signature on these documents.
            </p>
          )}
          {error && <p className="text-destructive-foreground text-sm">{error}</p>}
          <div className="flex flex-wrap items-center gap-2">
            {canSign &&
              (missing.length > 0 ? (
                <Button onClick={goToNext}>
                  Next: {missing.length} field{missing.length === 1 ? "" : "s"} left
                </Button>
              ) : (
                <Button loading={pending} onClick={finish}>
                  Finish
                </Button>
              ))}
            <Button onClick={() => setDeclining(true)} variant="ghost">
              Decline to sign
            </Button>
          </div>
        </footer>
      )}
      <SignatureDialog
        kind={adopting ?? "signature"}
        name={view.signer.name}
        onAdopt={(image) => {
          if (adopting) setImages((current) => ({ ...current, [adopting]: image }));
          setAdopting(null);
        }}
        onOpenChange={(open) => {
          if (!open) setAdopting(null);
        }}
        open={adopting !== null}
      />
      <DeclineDialog
        call={call}
        onOpenChange={setDeclining}
        onView={onView}
        open={declining}
        view={view}
      />
    </main>
  );
}

function FieldBox({
  field,
  scale,
  value,
  images,
  name,
  email,
  disabled,
  onAdopt,
  onValue,
  refCallback,
}: {
  field: Field;
  scale: number;
  value: string | boolean | undefined;
  images: Partial<Record<SignatureKind, string>>;
  name: string;
  email: string;
  disabled: boolean;
  onAdopt: (kind: SignatureKind) => void;
  onValue: (value: string | boolean) => void;
  refCallback: (element: HTMLElement | null) => void;
}) {
  const style = {
    left: field.x * scale,
    top: field.y * scale,
    width: field.width * scale,
    height: field.height * scale,
  };
  const fontSize = Math.max(8, Math.min(field.height * scale * 0.6, 16));
  const box =
    "absolute flex items-center rounded-sm border border-primary/60 bg-primary/8 text-gray-900";
  switch (field.type) {
    case "signature":
    case "initials": {
      const image = images[field.type];
      return (
        <button
          aria-label={field.type === "signature" ? "Sign here" : "Initial here"}
          className={`${box} justify-center overflow-hidden ${disabled ? "cursor-default" : "cursor-pointer hover:bg-primary/16"}`}
          disabled={disabled}
          onClick={() => onAdopt(field.type as SignatureKind)}
          ref={refCallback}
          style={{ ...style, fontSize }}
          type="button"
        >
          {image ? (
            // biome-ignore lint/performance/noImgElement: a data: URL the signer just drew.
            <img alt="" className="size-full object-contain" src={image} />
          ) : field.type === "signature" ? (
            "Sign"
          ) : (
            "Initial"
          )}
        </button>
      );
    }
    case "date_signed":
      return (
        <div className={`${box} px-1`} style={{ ...style, fontSize }}>
          {displayDate()}
        </div>
      );
    case "name":
      return (
        <div className={`${box} px-1`} style={{ ...style, fontSize }}>
          {name}
        </div>
      );
    case "email":
      return (
        <div className={`${box} truncate px-1`} style={{ ...style, fontSize }}>
          {email}
        </div>
      );
    case "checkbox":
      return (
        <input
          aria-label={field.label ?? "Checkbox"}
          checked={value === true}
          className="absolute accent-[var(--primary)]"
          disabled={disabled}
          onChange={(event) => onValue(event.target.checked)}
          ref={refCallback}
          style={style}
          type="checkbox"
        />
      );
    case "text":
      if (field.prefilled) {
        // Read-only, but all of it can be read before signing: a longer value scrolls in its box
        // (it is signed whole), and the whole value is its accessible name.
        return (
          <input
            aria-label={`${field.label ?? "Text"}: ${field.value ?? ""}`}
            className={`${box} cursor-text px-1 outline-none focus:ring-2 focus:ring-primary`}
            readOnly
            style={{ ...style, fontSize }}
            title={typeof field.value === "string" ? field.value : undefined}
            type="text"
            value={typeof field.value === "string" ? field.value : ""}
          />
        );
      }
      return (
        <input
          aria-label={field.label ?? "Text"}
          className={`${box} px-1 outline-none focus:ring-2 focus:ring-primary`}
          disabled={disabled}
          maxLength={1000}
          onChange={(event) => onValue(event.target.value)}
          placeholder={field.label ?? ""}
          ref={refCallback}
          style={{ ...style, fontSize }}
          value={typeof value === "string" ? value : ""}
        />
      );
  }
}

function DeclineDialog({
  view,
  open,
  onOpenChange,
  onView,
  call,
}: {
  view: SigningView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onView: (view: SigningView) => void;
  call: ReturnType<typeof useSigningApi>;
}) {
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const decline = async () => {
    setPending(true);
    setError(null);
    try {
      const response = await call("/decline", {
        method: "POST",
        body: { reason: reason.trim() || null },
      });
      const next = (await response.json()) as SigningView;
      postToHost({
        type: "declined",
        request_id: next.request.id,
        signer_id: next.signer.id,
        reason: reason.trim() || null,
      });
      onOpenChange(false);
      onView(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  };
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Decline to sign?</DialogTitle>
          <DialogDescription>
            {view.requester.name} will be told, and nobody can sign {view.request.title} after this.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-2">
          <Label htmlFor="decline-reason">Reason (optional)</Label>
          <Textarea
            id="decline-reason"
            maxLength={1000}
            onChange={(event) => setReason(event.target.value)}
            value={reason}
          />
          {error && <p className="text-destructive-foreground text-sm">{error}</p>}
        </DialogPanel>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="ghost">
            Keep it
          </Button>
          <Button
            disabled={view.read_only}
            loading={pending}
            onClick={decline}
            variant="destructive"
          >
            Decline
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
