import { db, type Executor, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { and, eq, isNull } from "drizzle-orm";
import { authorizeLiveSender } from "./domains.ts";
import { EmailError } from "./errors.ts";
import { COSS_EVENT_SOURCE, recordProviderEvent } from "./events.ts";
import type { EmailProvider, OutboundEmail, ProviderEvent } from "./provider.ts";
import { type EmailRow, selectEmailsWithMode, toEmailObjects } from "./read.ts";
import { hashSendRequest } from "./request-hash.ts";
import {
  type EmailObjectOutput,
  parseEmailAddress,
  type SendEmailRequestOutput,
} from "./schemas.ts";
import { type SuppressionRow, suppressedRecipients } from "./suppressions.ts";

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
};

export type EmailService = {
  send(input: SendEmailInput): Promise<{ email: EmailObjectOutput; replayed: boolean }>;
  dispatch(input: { organizationId: string; emailId: string }): Promise<EmailObjectOutput>;
};

/** An idempotency key can be reused for a different request once its email is this old. */
export const IDEMPOTENCY_KEY_TTL_MS = 24 * 60 * 60 * 1000;

/** Each retry means another request changed the key's owner under us; this never loops in practice. */
const MAX_IDEMPOTENCY_ATTEMPTS = 5;
const ERROR_MESSAGE_MAX_LENGTH = 1000;

const { email, emailRecipient } = schema;

function bareAddress(value: string): string {
  return parseEmailAddress(value).address.toLowerCase();
}

/** The message for the provider, without the recipients COSS suppressed. */
function toOutbound(row: EmailRow, suppressed: ReadonlySet<string>): OutboundEmail {
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

/** The event COSS records when the provider rejects a send. */
function failedEvent(row: EmailRow, provider: string): ProviderEvent {
  return {
    provider: COSS_EVENT_SOURCE,
    providerEventType: "ProviderError",
    emailId: row.id,
    providerMessageId: null,
    type: "email.failed",
    recipients: null,
    occurredAt: new Date(),
    sourceId: provider,
    data: {
      failure: { code: "provider_error", message: "The email provider did not accept the email." },
    },
  };
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

export function createEmailService(opts: {
  liveProvider: EmailProvider;
  sandboxProvider: EmailProvider;
}): EmailService {
  // Sandbox environments never reach a real provider, whatever `liveProvider` is.
  const providerFor = (sandbox: boolean) => (sandbox ? opts.sandboxProvider : opts.liveProvider);

  /** Hands a queued email to its provider and records the outcome. Never throws for provider errors. */
  async function deliver(row: EmailRow, sandbox: boolean): Promise<EmailObjectOutput> {
    if (row.status !== "queued") return currentEmail(row);

    const provider = providerFor(sandbox);
    // Claim the email first so concurrent dispatchers (e.g. a future worker) never send it twice.
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

    let outcome: Partial<EmailRow>;
    let events: ProviderEvent[];
    const message = toOutbound(row, await suppressedAddresses(row));
    if (message.to.length + message.cc.length + message.bcc.length === 0) {
      // Every recipient is suppressed: nothing to hand over. Each one already has its
      // `email.suppressed` event, so no `email.failed` event is added.
      outcome = {
        status: "failed",
        provider: provider.name,
        errorCode: "all_recipients_suppressed",
        errorMessage: "Every recipient is on the suppression list.",
      };
      events = [];
    } else {
      try {
        const result = await provider.send(message);
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
      // A failure only counts if it is the recorded outcome; provider events are facts either way.
      if (!updated && outcome.status === "failed") return;
      for (const event of events) await recordProviderEvent(tx, event);
    });
    return currentEmail(row);
  }

  async function currentEmail(row: EmailRow): Promise<EmailObjectOutput> {
    const [current] = await selectEmailsWithMode(row.organizationId, eq(email.id, row.id), 1);
    if (!current) throw new EmailError("not_found", "Email not found.");
    const [object] = await toEmailObjects(row.organizationId, [current]);
    if (!object) throw new EmailError("not_found", "Email not found.");
    return object;
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

  /** The finished email an unexpired idempotency key with the same request hash points at. */
  async function findReplay(
    environment: SendEnvironment,
    idempotencyKey: string,
    requestHash: string | null,
  ): Promise<EmailObjectOutput | null> {
    const [existing] = await db
      .select()
      .from(email)
      .where(
        and(
          eq(email.organizationId, environment.organizationId),
          eq(email.environmentId, environment.environmentId),
          eq(email.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    if (
      !existing ||
      existing.status === "queued" ||
      existing.requestHash !== requestHash ||
      Date.now() - existing.createdAt.getTime() > IDEMPOTENCY_KEY_TTL_MS
    ) {
      return null;
    }
    const [object] = await toEmailObjects(environment.organizationId, [
      { email: existing, sandbox: environment.mode === "sandbox" },
    ]);
    return object ?? null;
  }

  async function send(
    input: SendEmailInput,
  ): Promise<{ email: EmailObjectOutput; replayed: boolean }> {
    const { environment, params } = input;
    const sandbox = environment.mode === "sandbox";
    const idempotencyKey = input.idempotencyKey || null;
    const requestHash = idempotencyKey ? hashSendRequest(params) : null;

    // Tenancy columns always come from the authenticated environment, never from the request.
    const values = {
      organizationId: environment.organizationId,
      projectId: environment.projectId,
      environmentId: environment.environmentId,
      apiKeyId: input.apiKeyId,
      status: "queued",
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
      idempotencyKey,
      requestHash,
    } satisfies typeof email.$inferInsert;

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
          idempotencyKey && (await findReplay(environment, idempotencyKey, requestHash));
        if (replay) return { email: replay, replayed: true };
        throw error;
      }
    }

    // Inserts the email and, only if this request won the insert, its recipients: atomically, so
    // a stored email always has its recipient rows. Recipients on the suppression list are stored
    // `suppressed` (with an `email.suppressed` event) and never handed to the provider.
    const insertEmail = async (executor: Executor): Promise<EmailRow | undefined> => {
      const [row] = await executor
        .insert(email)
        .values(values)
        .onConflictDoNothing({ target: [email.environmentId, email.idempotencyKey] })
        .returning();
      if (!row) return row;
      const recipients = recipientRows(row);
      const suppressed = await suppressedRecipients(
        executor,
        environment,
        recipients.map((recipient) => recipient.address),
        row.category,
      );
      await executor.insert(emailRecipient).values(recipients);
      for (const [address, entry] of suppressed) {
        await recordProviderEvent(executor, suppressedEvent(row, address, entry));
      }
      return row;
    };
    const insertOnce = () => db.transaction((tx) => insertEmail(tx));

    if (!idempotencyKey) {
      const row = await insertOnce();
      if (!row) throw new Error("Email insert returned no row.");
      return { email: await deliver(row, sandbox), replayed: false };
    }

    const sameKey = and(
      eq(email.organizationId, environment.organizationId),
      eq(email.environmentId, environment.environmentId),
      eq(email.idempotencyKey, idempotencyKey),
    );
    // The unique (environment_id, idempotency_key) index arbitrates races: exactly one request
    // inserts, every other one sees `DO NOTHING` and inspects the winner's row.
    let inserted = await insertOnce();
    for (let attempt = 1; !inserted; attempt++) {
      if (attempt > MAX_IDEMPOTENCY_ATTEMPTS) {
        throw new EmailError("request_in_progress", "This idempotency key is busy. Retry shortly.");
      }
      const [existing] = await db.select().from(email).where(sameKey).limit(1);
      if (!existing) {
        // Its owner expired and released the key between our insert and select.
        inserted = await insertOnce();
        continue;
      }
      if (Date.now() - existing.createdAt.getTime() > IDEMPOTENCY_KEY_TTL_MS) {
        // Expired: move the key to a new email atomically. The compare-and-set on the old row
        // makes concurrent requests with the same expired key queue up behind each other.
        inserted = await db.transaction(async (tx) => {
          await tx
            .update(email)
            .set({ idempotencyKey: null })
            .where(and(eq(email.id, existing.id), eq(email.idempotencyKey, idempotencyKey)));
          return insertEmail(tx);
        });
        continue;
      }
      if (existing.requestHash !== requestHash) {
        throw new EmailError(
          "idempotency_key_reused",
          "This idempotency key was already used with a different request body.",
        );
      }
      if (existing.status === "queued") {
        throw new EmailError(
          "request_in_progress",
          "A request with this idempotency key is still being processed. Retry shortly.",
        );
      }
      const [replayed] = await toEmailObjects(environment.organizationId, [
        { email: existing, sandbox },
      ]);
      if (!replayed) throw new Error("Email replay produced no object.");
      return { email: replayed, replayed: true };
    }
    return { email: await deliver(inserted, sandbox), replayed: false };
  }

  return { send, dispatch };
}
