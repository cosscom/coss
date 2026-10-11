import { db, schema, type Transaction } from "@coss/db";
import { isId } from "@coss/db/id";
import type { ScreenInput, ScreenOutcome } from "@coss/screening";
import { and, asc, eq, inArray, isNull, lte, notExists } from "drizzle-orm";
import {
  insertAttachments,
  loadOutboundAttachments,
  prepareAttachments,
  purgeAttachmentContent,
} from "./attachments.ts";
import type { EmailDispatchQueue } from "./dispatch.ts";
import { authorizeLiveSender } from "./domains.ts";
import { EmailError } from "./errors.ts";
import { COSS_EVENT_SOURCE, recordProviderEvent } from "./events.ts";
import type {
  EmailProvider,
  OutboundAttachment,
  OutboundEmail,
  ProviderEvent,
} from "./provider.ts";
import { type EmailRow, selectEmailsWithMode, toEmailObjects } from "./read.ts";
import { canonicalJson, hashSendBatchRequest, hashSendRequest } from "./request-hash.ts";
import {
  type EmailBatchObjectOutput,
  type EmailObjectOutput,
  parseEmailAddress,
  type SendEmailRequestOutput,
} from "./schemas.ts";
import { emailScreeningContent } from "./screening.ts";
import { type SuppressionRow, suppressedRecipients } from "./suppressions.ts";
import { newTrackingToken } from "./tracking.ts";
import { instrumentHtml } from "./tracking-html.ts";
import { resolveTracking } from "./tracking-settings.ts";

/** The authenticated environment a send happens in (from `authenticateApiKey`). */
export type SendEnvironment = {
  organizationId: string;
  projectId: string;
  environmentId: string;
  mode: "live" | "sandbox";
};

export type SendEmailInput = {
  environment: SendEnvironment;
  apiKeyId: string | null;
  params: SendEmailRequestOutput;
  idempotencyKey?: string | null;
  /** Internal callers only: use the same retention on every retry; Infinity never expires. */
  idempotencyRetentionMs?: number;
};

export type SendEmailBatchInput = {
  environment: SendEnvironment;
  apiKeyId: string | null;
  emails: SendEmailRequestOutput[];
  idempotencyKey?: string | null;
};

export type EmailService = {
  /** Read a matching replay without creating or dispatching an email. */
  replay(input: SendEmailInput): Promise<EmailObjectOutput | null>;
  /** Stores the email; immediate sends enqueue a job, future sends wait as `scheduled`. */
  send(input: SendEmailInput): Promise<{ email: EmailObjectOutput; replayed: boolean }>;
  /** Read a matching batch replay without creating or dispatching anything. */
  replayBatch(input: SendEmailBatchInput): Promise<EmailBatchObjectOutput | null>;
  /**
   * Stores every email of the batch, as `send` would, in one transaction: all of them or none.
   * One idempotency key covers the whole batch.
   */
  sendBatch(
    input: SendEmailBatchInput,
  ): Promise<{ batch: EmailBatchObjectOutput; replayed: boolean }>;
  /** Hands a queued email to its provider (the worker's dispatch job). Safe to run twice. */
  dispatch(input: { organizationId: string; emailId: string }): Promise<EmailObjectOutput>;
  /** Cancels a scheduled email; an already canceled one is returned as is. */
  cancel(input: {
    organizationId: string;
    environmentId: string;
    emailId: string;
  }): Promise<EmailObjectOutput>;
  /**
   * System-level (worker): sends scheduled emails whose time has come, across organizations.
   * Returns how many due emails it looked at.
   */
  dispatchDue(opts?: DispatchDueOptions): Promise<number>;
};

export type DispatchDueOptions = {
  now?: Date;
  limit?: number;
  signal?: AbortSignal;
  scope?: { organizationIds: string[] };
};

const DISPATCH_DUE_LIMIT = 50;
// At most five attachment payloads (up to 25 MB each) in memory at once.
const DISPATCH_DUE_CONCURRENCY = 5;

/** An idempotency key can be reused for a different request once its email is this old. */
export const IDEMPOTENCY_KEY_TTL_MS = 24 * 60 * 60 * 1000;

/** Each retry means another request changed the key's owner under us; this never loops in practice. */
const MAX_IDEMPOTENCY_ATTEMPTS = 5;
const ERROR_MESSAGE_MAX_LENGTH = 1000;

const { email, emailBatch, emailLink, emailRecipient, environment, organizationSuspension } =
  schema;

function organizationActive() {
  return notExists(
    db
      .select({ id: organizationSuspension.organizationId })
      .from(organizationSuspension)
      .where(eq(organizationSuspension.organizationId, email.organizationId)),
  );
}

function bareAddress(value: string): string {
  return parseEmailAddress(value).address.toLowerCase();
}

/** The message for the provider, without the recipients COSS suppressed. */
function toOutbound(
  row: EmailRow,
  suppressed: ReadonlySet<string>,
  attachments: OutboundAttachment[],
): OutboundEmail {
  const keep = (list: string[]) => list.filter((value) => !suppressed.has(bareAddress(value)));
  return {
    emailId: row.id,
    organizationId: row.organizationId,
    from: row.from,
    to: keep(row.to),
    cc: keep(row.cc),
    bcc: keep(row.bcc),
    replyTo: row.replyTo,
    subject: row.subject,
    html: row.html,
    text: row.text,
    headers: row.headers,
    tags: row.tags,
    attachments,
  };
}

/**
 * One recipient row per distinct address; an address listed twice keeps its first kind (to → cc →
 * bcc). Rows start `queued`.
 */
function recipientRows(row: EmailRow): (typeof emailRecipient.$inferInsert)[] {
  const seen = new Set<string>();
  const rows: (typeof emailRecipient.$inferInsert)[] = [];
  for (const [kind, list] of [
    ["to", row.to],
    ["cc", row.cc],
    ["bcc", row.bcc],
  ] as const) {
    for (const value of list) {
      const address = bareAddress(value);
      if (seen.has(address)) continue;
      seen.add(address);
      rows.push({
        organizationId: row.organizationId,
        emailId: row.id,
        address,
        kind,
        position: rows.length,
      });
    }
  }
  return rows;
}

/** A whole-message event COSS itself records about an email. */
function cossEvent(
  row: EmailRow,
  event: Pick<ProviderEvent, "type" | "providerEventType" | "sourceId" | "data">,
): ProviderEvent {
  return {
    ...event,
    provider: COSS_EVENT_SOURCE,
    emailId: row.id,
    providerMessageId: null,
    recipients: null,
    occurredAt: new Date(),
  };
}

/** The event COSS records when the provider rejects a send. */
function failedEvent(
  row: EmailRow,
  provider: string,
  failure = { code: "provider_error", message: "The email provider did not accept the email." },
): ProviderEvent {
  return cossEvent(row, {
    type: "email.failed",
    providerEventType: "ProviderError",
    sourceId: provider,
    data: { failure },
  });
}

/** The event COSS records for a recipient it skipped because of a suppression list entry. */
function suppressedEvent(row: EmailRow, address: string, entry: SuppressionRow): ProviderEvent {
  return {
    provider: COSS_EVENT_SOURCE,
    providerEventType: "Suppressed",
    emailId: row.id,
    providerMessageId: null,
    type: "email.suppressed",
    recipients: [address],
    occurredAt: new Date(),
    sourceId: entry.id,
    data: { suppression: { id: entry.id, scope: entry.scope, reason: entry.reason } },
  };
}

/** Recipients of an email that a suppression entry made COSS skip. */
async function suppressedAddresses(row: EmailRow): Promise<Set<string>> {
  const rows = await db
    .select({ address: emailRecipient.address })
    .from(emailRecipient)
    .where(
      and(
        eq(emailRecipient.organizationId, row.organizationId),
        eq(emailRecipient.emailId, row.id),
        eq(emailRecipient.status, "suppressed"),
      ),
    );
  return new Set(rows.map((recipient) => recipient.address));
}

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, ERROR_MESSAGE_MAX_LENGTH) || "Unknown provider error.";
}

export type EmailServiceOptions = {
  liveProvider: EmailProvider;
  sandboxProvider: EmailProvider;
  queue: EmailDispatchQueue;
  /**
   * Public origin of the API's `/t/*` tracking routes (no trailing slash). Without it, sends that
   * resolve to open or click tracking fail.
   */
  trackingBaseUrl?: string;
  /**
   * Content screening of live emails, right before they reach the provider (the worker passes
   * `screenMessage` from `@coss/screening`). A `block` fails the email with `content_rejected`.
   */
  screen?: (input: ScreenInput) => Promise<Pick<ScreenOutcome, "action">>;
};

const CONTENT_REJECTED = {
  code: "content_rejected",
  message: "The email was blocked by content screening.",
};

export function createEmailService(opts: EmailServiceOptions): EmailService {
  const trackingBaseUrl = opts.trackingBaseUrl?.replace(/\/+$/, "");
  // Sandbox environments never reach a real provider, whatever `liveProvider` is.
  const providerFor = (sandbox: boolean) => (sandbox ? opts.sandboxProvider : opts.liveProvider);

  /**
   * Hands a queued email to its provider and records the outcome. Never throws for provider errors.
   * Any other email (e.g. a `scheduled` one, which the worker dispatches) is returned as is.
   */
  async function deliver(row: EmailRow, sandbox: boolean): Promise<EmailObjectOutput> {
    if (row.status !== "queued") return currentEmail(row);

    const provider = providerFor(sandbox);
    // Claim the email first so concurrent dispatchers (e.g. a retried job) never send it twice.
    // `provider` is only ever set by this claim. A crash after the claim leaves the row `queued`
    // with a provider: the worker's stale-claim sweep resolves it.
    const [claimed] = await db
      .update(email)
      .set({ provider: provider.name })
      .where(
        and(
          eq(email.id, row.id),
          eq(email.organizationId, row.organizationId),
          eq(email.status, "queued"),
          isNull(email.provider),
        ),
      )
      .returning({ id: email.id });
    if (!claimed) return currentEmail(row);
    await complete(row, provider, sandbox);
    return currentEmail(row);
  }

  /** Whether content screening refuses a live email (fails open: errors never block). */
  async function screeningBlocks(row: EmailRow, sandbox: boolean): Promise<boolean> {
    if (sandbox || !opts.screen) return false;
    try {
      const outcome = await opts.screen({
        organizationId: row.organizationId,
        environmentId: row.environmentId,
        product: "email",
        subjectId: row.id,
        content: () => emailScreeningContent(row),
      });
      return outcome.action === "block";
    } catch (error) {
      console.error(`[email] content screening failed for ${row.id}:`, error);
      return false;
    }
  }

  /** Sends an email this process claimed for `provider` and records the outcome. */
  async function complete(row: EmailRow, provider: EmailProvider, sandbox: boolean): Promise<void> {
    let outcome: Partial<EmailRow>;
    let events: ProviderEvent[];
    const attachments = await loadOutboundAttachments(row);
    const message = toOutbound(row, await suppressedAddresses(row), attachments ?? []);
    if (attachments === null) {
      // Content is only purged once an email leaves `queued`, so this means a bug elsewhere:
      // never send the email without the attachments it was requested with.
      outcome = {
        status: "failed",
        provider: provider.name,
        errorCode: "attachments_unavailable",
        errorMessage: "The email's attachments are no longer stored.",
      };
      events = [
        failedEvent(row, provider.name, {
          code: "attachments_unavailable",
          message: "The email's attachments are no longer stored.",
        }),
      ];
    } else if (message.to.length + message.cc.length + message.bcc.length === 0) {
      // Every recipient is suppressed: nothing to hand over. Each one already has its
      // `email.suppressed` event, so no `email.failed` event is added.
      outcome = {
        status: "failed",
        provider: provider.name,
        errorCode: "all_recipients_suppressed",
        errorMessage: "Every recipient is on the suppression list.",
      };
      events = [];
    } else if (await screeningBlocks(row, sandbox)) {
      outcome = {
        status: "failed",
        provider: provider.name,
        errorCode: CONTENT_REJECTED.code,
        errorMessage: CONTENT_REJECTED.message,
      };
      events = [failedEvent(row, provider.name, CONTENT_REJECTED)];
    } else {
      try {
        const result = await provider.send(await instrument(row, message));
        outcome = {
          status: "sent",
          provider: provider.name,
          providerMessageId: result.providerMessageId,
          sentAt: new Date(),
        };
        events = result.events ?? [];
      } catch (error) {
        console.error(`[email] provider "${provider.name}" failed to send ${row.id}:`, error);
        outcome = {
          status: "failed",
          provider: provider.name,
          errorCode: "provider_error",
          errorMessage: errorMessage(error),
        };
        events = [failedEvent(row, provider.name)];
      }
    }

    await db.transaction(async (tx) => {
      // Still guarded on `queued` so a finished email is never overwritten (e.g. by a provider
      // `Send` event that arrived before the send call returned).
      const [updated] = await tx
        .update(email)
        .set(outcome)
        .where(
          and(
            eq(email.id, row.id),
            eq(email.organizationId, row.organizationId),
            eq(email.status, "queued"),
          ),
        )
        .returning({ id: email.id });
      // Either way the email has left `queued`, so its attachments are no longer needed.
      await purgeAttachmentContent(tx, row);
      // A failure only counts if it is the recorded outcome; provider events are facts either way.
      if (!updated && outcome.status === "failed") return;
      for (const event of events) await recordProviderEvent(tx, event);
    });
  }

  /**
   * Hands one due scheduled email to its provider. The sender and the suppression list are
   * checked again: either may have changed since the email was scheduled.
   */
  async function dispatchScheduled(row: EmailRow, sandbox: boolean, now: Date): Promise<void> {
    const provider = providerFor(sandbox);
    // Only a still-scheduled, due email moves on; this compare-and-set is what keeps concurrent
    // workers (and a cancel) from both acting on it.
    const stillDue = and(
      eq(email.id, row.id),
      eq(email.organizationId, row.organizationId),
      eq(email.status, "scheduled"),
      isNull(email.provider),
      lte(email.scheduledAt, now),
      organizationActive(),
    );

    if (!sandbox) {
      try {
        await authorizeLiveSender({
          provider: provider.name,
          organizationId: row.organizationId,
          from: row.from,
        });
      } catch (error) {
        if (!(error instanceof EmailError)) throw error;
        await db.transaction(async (tx) => {
          const [failed] = await tx
            .update(email)
            .set({ status: "failed", errorCode: error.code, errorMessage: error.message })
            .where(stillDue)
            .returning({ id: email.id });
          if (!failed) return;
          await purgeAttachmentContent(tx, row);
          await recordProviderEvent(
            tx,
            cossEvent(row, {
              type: "email.failed",
              providerEventType: "SenderRejected",
              sourceId: error.code,
              data: { failure: { code: error.code, message: error.message } },
            }),
          );
        });
        return;
      }
    }

    // Claims straight from `scheduled`, so a crash after this point leaves a claimed `queued`
    // row for the stale-claim sweep, never an old unclaimed row for the queue-recovery sweep.
    const claimed = await db.transaction(async (tx) => {
      const [claimedRow] = await tx
        .update(email)
        .set({ status: "queued", provider: provider.name })
        .where(stillDue)
        .returning();
      if (!claimedRow) return undefined;
      const pending = await tx
        .select({ address: emailRecipient.address })
        .from(emailRecipient)
        .where(
          and(
            eq(emailRecipient.organizationId, row.organizationId),
            eq(emailRecipient.emailId, row.id),
            eq(emailRecipient.status, "queued"),
          ),
        );
      const suppressed = await suppressedRecipients(
        tx,
        claimedRow,
        pending.map((recipient) => recipient.address),
        claimedRow.category,
      );
      for (const [address, entry] of suppressed) {
        await recordProviderEvent(tx, suppressedEvent(claimedRow, address, entry));
      }
      return claimedRow;
    });
    if (claimed) await complete(claimed, provider, sandbox);
  }

  async function dispatchDue(opts: DispatchDueOptions = {}): Promise<number> {
    const now = opts.now ?? new Date();
    const due = await db
      .select({ email, mode: environment.mode })
      .from(email)
      .innerJoin(
        environment,
        and(
          eq(environment.id, email.environmentId),
          eq(environment.organizationId, email.organizationId),
        ),
      )
      .where(
        and(
          eq(email.status, "scheduled"),
          lte(email.scheduledAt, now),
          organizationActive(),
          opts.scope ? inArray(email.organizationId, opts.scope.organizationIds) : undefined,
        ),
      )
      .orderBy(asc(email.scheduledAt))
      .limit(opts.limit ?? DISPATCH_DUE_LIMIT);
    for (let offset = 0; offset < due.length; offset += DISPATCH_DUE_CONCURRENCY) {
      if (opts.signal?.aborted) break;
      const batch = due.slice(offset, offset + DISPATCH_DUE_CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map((row) => dispatchScheduled(row.email, row.mode === "sandbox", now)),
      );
      for (const [index, result] of results.entries()) {
        if (result.status === "rejected") {
          console.error(
            `[email] dispatching scheduled ${batch[index]?.email.id} failed:`,
            result.reason,
          );
        }
      }
    }
    return due.length;
  }

  /**
   * Adds the open pixel and click redirects to the provider's copy of the HTML (the stored email
   * keeps the original) and stores the links first, so a click can never beat its link row.
   */
  async function instrument(row: EmailRow, message: OutboundEmail): Promise<OutboundEmail> {
    if (!row.html || !row.trackingToken || (!row.trackOpens && !row.trackClicks)) return message;
    if (!trackingBaseUrl) throw new Error("Tracking requires the email service's trackingBaseUrl.");
    const { html, links } = instrumentHtml(row.html, {
      baseUrl: trackingBaseUrl,
      token: row.trackingToken,
      opens: row.trackOpens,
      clicks: row.trackClicks,
    });
    if (links.length > 0) {
      await db
        .insert(emailLink)
        .values(
          links.map((link) => ({
            organizationId: row.organizationId,
            emailId: row.id,
            position: link.position,
            url: link.url,
          })),
        )
        .onConflictDoNothing({ target: [emailLink.emailId, emailLink.position] });
    }
    return { ...message, html };
  }

  async function dispatch(input: {
    organizationId: string;
    emailId: string;
  }): Promise<EmailObjectOutput> {
    const [found] = isId("email", input.emailId)
      ? await selectEmailsWithMode(input.organizationId, eq(email.id, input.emailId), 1)
      : [];
    if (!found) throw new EmailError("not_found", "Email not found.");
    return deliver(found.email, found.sandbox);
  }

  /** The email an unexpired idempotency key with the same request hash points at. */
  async function findReplay(
    environment: SendEnvironment,
    idempotencyKey: string,
    requestHash: string | null,
    retentionMs = IDEMPOTENCY_KEY_TTL_MS,
  ): Promise<EmailObjectOutput | null> {
    const [existing] = await db
      .select()
      .from(email)
      .where(sameEmailKey(environment, idempotencyKey))
      .limit(1);
    if (!existing || !isReplayOf(existing, requestHash, retentionMs)) return null;
    const [object] = await toEmailObjects(environment.organizationId, [
      { email: existing, sandbox: environment.mode === "sandbox" },
    ]);
    return object ?? null;
  }

  /** The batch an unexpired idempotency key with the same request hash points at. */
  async function findBatchReplay(
    environment: SendEnvironment,
    idempotencyKey: string,
    requestHash: string | null,
  ): Promise<EmailBatchObjectOutput | null> {
    const [existing] = await db
      .select()
      .from(emailBatch)
      .where(sameBatchKey(environment, idempotencyKey))
      .limit(1);
    if (!existing || !isReplayOf(existing, requestHash)) return null;
    return toEmailBatchObject(existing, environment.mode === "sandbox");
  }

  /**
   * Everything about one email that is decided before its insert transaction (which may be
   * retried): tracking, status, row values and decoded attachments.
   */
  async function prepareSend(
    environment: SendEnvironment,
    apiKeyId: string | null,
    params: SendEmailRequestOutput,
    trackingCache: Map<string, Promise<{ opens: boolean; clicks: boolean }>>,
  ): Promise<PreparedSend> {
    const scheduledAt = params.scheduled_at === undefined ? null : new Date(params.scheduled_at);
    // A time that is not in the future sends now (still recorded as `scheduled_at`).
    const scheduled = scheduledAt !== null && scheduledAt.getTime() > Date.now();

    // Resolved once, at send: later changes to the settings never affect a stored email.
    const trackingKey = canonicalJson([params.category ?? null, params.tracking ?? null]);
    let resolving = trackingCache.get(trackingKey);
    if (!resolving) {
      resolving = resolveTracking(db, environment, params.category ?? null, params.tracking);
      trackingCache.set(trackingKey, resolving);
    }
    const tracking = await resolving;
    if ((tracking.opens || tracking.clicks) && !trackingBaseUrl) {
      throw new Error("Tracking requires the email service's trackingBaseUrl.");
    }

    return {
      // Tenancy columns always come from the authenticated environment, never from the request.
      values: {
        organizationId: environment.organizationId,
        projectId: environment.projectId,
        environmentId: environment.environmentId,
        apiKeyId,
        status: scheduled ? "scheduled" : "queued",
        scheduledAt,
        from: params.from,
        to: params.to,
        cc: params.cc,
        bcc: params.bcc,
        replyTo: params.reply_to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        headers: params.headers,
        tags: params.tags,
        category: params.category ?? null,
        trackOpens: tracking.opens,
        trackClicks: tracking.clicks,
      },
      scheduled,
      // Decoded once, outside the (retried) insert transaction.
      attachments: prepareAttachments(params),
    };
  }

  /**
   * Inserts a prepared email and, only if this request won the insert, its recipients and
   * dispatch job: atomically, so a stored email always has its recipient rows and is always
   * dispatched. Recipients on the suppression list are stored `suppressed` (with an
   * `email.suppressed` event) and never handed to the provider.
   */
  async function insertPrepared(
    tx: Transaction,
    environment: SendEnvironment,
    prepared: PreparedSend,
    extra: Pick<
      typeof email.$inferInsert,
      "idempotencyKey" | "requestHash" | "batchId" | "batchIndex"
    >,
  ): Promise<EmailRow | undefined> {
    const tracked = prepared.values.trackOpens || prepared.values.trackClicks;
    const [row] = await tx
      .insert(email)
      .values({
        ...prepared.values,
        ...extra,
        trackingToken: tracked ? newTrackingToken() : null,
      })
      .onConflictDoNothing({ target: [email.environmentId, email.idempotencyKey] })
      .returning();
    if (!row) return row;
    const recipients = recipientRows(row);
    const suppressed = await suppressedRecipients(
      tx,
      environment,
      recipients.map((recipient) => recipient.address),
      row.category,
    );
    await tx.insert(emailRecipient).values(recipients);
    await insertAttachments(tx, row, prepared.attachments);
    if (row.status === "scheduled") {
      await recordProviderEvent(
        tx,
        cossEvent(row, {
          type: "email.scheduled",
          providerEventType: "Scheduled",
          sourceId: "scheduled",
          data: {},
        }),
      );
    }
    for (const [address, entry] of suppressed) {
      await recordProviderEvent(tx, suppressedEvent(row, address, entry));
    }
    if (!prepared.scheduled) {
      await opts.queue.enqueue(tx, { organizationId: row.organizationId, emailId: row.id });
    }
    return row;
  }

  async function send(
    input: SendEmailInput,
  ): Promise<{ email: EmailObjectOutput; replayed: boolean }> {
    const { environment, params } = input;
    const retentionMs = input.idempotencyRetentionMs ?? IDEMPOTENCY_KEY_TTL_MS;
    const sandbox = environment.mode === "sandbox";
    const idempotencyKey = input.idempotencyKey || null;
    const requestHash = idempotencyKey ? hashSendRequest(params) : null;
    const prepared = await prepareSend(environment, input.apiKeyId, params, new Map());

    if (!sandbox) {
      try {
        await authorizeLiveSender({
          provider: opts.liveProvider.name,
          organizationId: environment.organizationId,
          from: params.from,
        });
      } catch (error) {
        // A retry of a request that already succeeded still replays, even if the domain changed since.
        const replay =
          idempotencyKey &&
          (await findReplay(environment, idempotencyKey, requestHash, retentionMs));
        if (replay) return { email: replay, replayed: true };
        throw error;
      }
    }

    const insertEmail = (tx: Transaction) =>
      insertPrepared(tx, environment, prepared, { idempotencyKey, requestHash });
    const stored = async (row: EmailRow, replayed: boolean) => {
      const [object] = await toEmailObjects(environment.organizationId, [{ email: row, sandbox }]);
      if (!object) throw new Error("Email serialization produced no object.");
      return { email: object, replayed };
    };

    if (!idempotencyKey || !requestHash) {
      const row = await db.transaction((tx) => insertEmail(tx));
      if (!row) throw new Error("Email insert returned no row.");
      return stored(row, false);
    }

    const { row, replayed } = await withIdempotencyKey({
      requestHash,
      retentionMs,
      insert: insertEmail,
      existing: async () => {
        const [existing] = await db
          .select()
          .from(email)
          .where(sameEmailKey(environment, idempotencyKey))
          .limit(1);
        return existing;
      },
      release: (tx, existing) =>
        tx
          .update(email)
          .set({ idempotencyKey: null })
          .where(and(eq(email.id, existing.id), eq(email.idempotencyKey, idempotencyKey))),
    });
    return stored(row, replayed);
  }

  async function sendBatch(
    input: SendEmailBatchInput,
  ): Promise<{ batch: EmailBatchObjectOutput; replayed: boolean }> {
    const { environment, emails: items } = input;
    const sandbox = environment.mode === "sandbox";
    const idempotencyKey = input.idempotencyKey || null;
    const requestHash = idempotencyKey ? hashSendBatchRequest(items) : null;
    const trackingCache = new Map<string, Promise<{ opens: boolean; clicks: boolean }>>();
    const prepared: PreparedSend[] = [];
    for (const params of items) {
      prepared.push(await prepareSend(environment, input.apiKeyId, params, trackingCache));
    }

    if (!sandbox) {
      // Every sender is checked before anything is stored: the batch is accepted as a whole.
      const senders = new Map<string, number>();
      items.forEach((params, index) => {
        if (!senders.has(params.from)) senders.set(params.from, index);
      });
      try {
        for (const [from, index] of senders) {
          try {
            await authorizeLiveSender({
              provider: opts.liveProvider.name,
              organizationId: environment.organizationId,
              from,
            });
          } catch (error) {
            if (error instanceof EmailError && error.code === "domain_not_verified") {
              throw new EmailError(error.code, error.message, { param: `emails.${index}.from` });
            }
            throw error;
          }
        }
      } catch (error) {
        // A retry of a request that already succeeded still replays, even if a domain changed since.
        const replay =
          idempotencyKey && (await findBatchReplay(environment, idempotencyKey, requestHash));
        if (replay) return { batch: replay, replayed: true };
        throw error;
      }
    }

    // The batch row and every email (with its recipients, events and dispatch job) commit
    // together: a batch is never partially stored.
    const insertBatch = async (tx: Transaction): Promise<EmailBatchRow | undefined> => {
      const [batch] = await tx
        .insert(emailBatch)
        .values({
          organizationId: environment.organizationId,
          projectId: environment.projectId,
          environmentId: environment.environmentId,
          apiKeyId: input.apiKeyId,
          idempotencyKey,
          requestHash,
        })
        .onConflictDoNothing({ target: [emailBatch.environmentId, emailBatch.idempotencyKey] })
        .returning();
      if (!batch) return batch;
      for (const [batchIndex, item] of prepared.entries()) {
        const row = await insertPrepared(tx, environment, item, { batchId: batch.id, batchIndex });
        if (!row) throw new Error("Batch email insert returned no row.");
      }
      return batch;
    };

    if (!idempotencyKey || !requestHash) {
      const batch = await db.transaction((tx) => insertBatch(tx));
      if (!batch) throw new Error("Email batch insert returned no row.");
      return { batch: await toEmailBatchObject(batch, sandbox), replayed: false };
    }

    const { row, replayed } = await withIdempotencyKey({
      requestHash,
      insert: insertBatch,
      existing: async () => {
        const [existing] = await db
          .select()
          .from(emailBatch)
          .where(sameBatchKey(environment, idempotencyKey))
          .limit(1);
        return existing;
      },
      release: (tx, existing) =>
        tx
          .update(emailBatch)
          .set({ idempotencyKey: null })
          .where(
            and(eq(emailBatch.id, existing.id), eq(emailBatch.idempotencyKey, idempotencyKey)),
          ),
    });
    return { batch: await toEmailBatchObject(row, sandbox), replayed };
  }

  async function replay(input: SendEmailInput): Promise<EmailObjectOutput | null> {
    if (!input.idempotencyKey) return null;
    return findReplay(
      input.environment,
      input.idempotencyKey,
      hashSendRequest(input.params),
      input.idempotencyRetentionMs,
    );
  }

  async function replayBatch(input: SendEmailBatchInput): Promise<EmailBatchObjectOutput | null> {
    if (!input.idempotencyKey) return null;
    return findBatchReplay(
      input.environment,
      input.idempotencyKey,
      hashSendBatchRequest(input.emails),
    );
  }

  return {
    send,
    sendBatch,
    dispatch,
    replay,
    replayBatch,
    cancel: cancelScheduledEmail,
    dispatchDue,
  };
}

type EmailBatchRow = typeof emailBatch.$inferSelect;

type PreparedSend = {
  values: Omit<
    typeof email.$inferInsert,
    "idempotencyKey" | "requestHash" | "batchId" | "batchIndex"
  >;
  scheduled: boolean;
  attachments: ReturnType<typeof prepareAttachments>;
};

function sameEmailKey(environment: SendEnvironment, idempotencyKey: string) {
  return and(
    eq(email.organizationId, environment.organizationId),
    eq(email.environmentId, environment.environmentId),
    eq(email.idempotencyKey, idempotencyKey),
  );
}

function sameBatchKey(environment: SendEnvironment, idempotencyKey: string) {
  return and(
    eq(emailBatch.organizationId, environment.organizationId),
    eq(emailBatch.environmentId, environment.environmentId),
    eq(emailBatch.idempotencyKey, idempotencyKey),
  );
}

function isReplayOf(
  existing: { createdAt: Date; requestHash: string | null },
  requestHash: string | null,
  retentionMs = IDEMPOTENCY_KEY_TTL_MS,
): boolean {
  return (
    existing.requestHash === requestHash && Date.now() - existing.createdAt.getTime() <= retentionMs
  );
}

/**
 * Inserts under an idempotency key, or replays the row that already holds it. The unique
 * (environment_id, idempotency_key) index arbitrates races: exactly one request inserts, every
 * other one waits for its commit, sees `DO NOTHING` (`insert` returns nothing) and replays the
 * winner's row, whatever its status (a queued email is replayed as queued).
 */
async function withIdempotencyKey<Row extends { createdAt: Date; requestHash: string | null }>(op: {
  requestHash: string;
  retentionMs?: number;
  insert: (tx: Transaction) => Promise<Row | undefined>;
  existing: () => Promise<Row | undefined>;
  /** Compare-and-set the key off an expired row. */
  release: (tx: Transaction, existing: Row) => Promise<unknown>;
}): Promise<{ row: Row; replayed: boolean }> {
  let inserted = await db.transaction((tx) => op.insert(tx));
  for (let attempt = 1; !inserted; attempt++) {
    if (attempt > MAX_IDEMPOTENCY_ATTEMPTS) {
      throw new EmailError("request_in_progress", "This idempotency key is busy. Retry shortly.");
    }
    const existing = await op.existing();
    if (!existing) {
      // Its owner expired and released the key between our insert and select.
      inserted = await db.transaction((tx) => op.insert(tx));
      continue;
    }
    if (Date.now() - existing.createdAt.getTime() > (op.retentionMs ?? IDEMPOTENCY_KEY_TTL_MS)) {
      // Expired: move the key to a new row atomically. The compare-and-set on the old row makes
      // concurrent requests with the same expired key queue up behind each other.
      inserted = await db.transaction(async (tx) => {
        await op.release(tx, existing);
        return op.insert(tx);
      });
      continue;
    }
    if (existing.requestHash !== op.requestHash) {
      throw new EmailError(
        "idempotency_key_reused",
        "This idempotency key was already used with a different request body.",
      );
    }
    return { row: existing, replayed: true };
  }
  return { row: inserted, replayed: false };
}

/** A batch with its emails in request order. */
async function toEmailBatchObject(
  batch: EmailBatchRow,
  sandbox: boolean,
): Promise<EmailBatchObjectOutput> {
  const rows = await db
    .select()
    .from(email)
    .where(and(eq(email.organizationId, batch.organizationId), eq(email.batchId, batch.id)))
    .orderBy(asc(email.batchIndex));
  return {
    object: "email_batch",
    id: batch.id,
    data: await toEmailObjects(
      batch.organizationId,
      rows.map((row) => ({ email: row, sandbox })),
    ),
    created_at: batch.createdAt.toISOString(),
  };
}

async function currentEmail(row: EmailRow): Promise<EmailObjectOutput> {
  const [current] = await selectEmailsWithMode(row.organizationId, eq(email.id, row.id), 1);
  if (!current) throw new EmailError("not_found", "Email not found.");
  const [object] = await toEmailObjects(row.organizationId, [current]);
  if (!object) throw new EmailError("not_found", "Email not found.");
  return object;
}

export async function cancelScheduledEmail(input: {
  organizationId: string;
  environmentId: string;
  emailId: string;
}): Promise<EmailObjectOutput> {
  const [found] = isId("email", input.emailId)
    ? await selectEmailsWithMode(
        input.organizationId,
        and(eq(email.environmentId, input.environmentId), eq(email.id, input.emailId)),
        1,
      )
    : [];
  if (!found) throw new EmailError("not_found", "Email not found.");
  const row = found.email;
  await db.transaction(async (tx) => {
    const [canceled] = await tx
      .update(email)
      .set({ status: "canceled" })
      .where(
        and(
          eq(email.id, row.id),
          eq(email.organizationId, row.organizationId),
          eq(email.status, "scheduled"),
          isNull(email.provider),
        ),
      )
      .returning({ id: email.id });
    if (!canceled) return;
    await purgeAttachmentContent(tx, row);
    await recordProviderEvent(
      tx,
      cossEvent(row, {
        type: "email.canceled",
        providerEventType: "Canceled",
        sourceId: "canceled",
        data: {},
      }),
    );
  });
  const current = await currentEmail(row);
  if (current.status !== "canceled") {
    throw new EmailError(
      "email_not_cancelable",
      `Only scheduled emails can be canceled; this email is ${current.status}.`,
    );
  }
  return current;
}
