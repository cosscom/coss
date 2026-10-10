import { db, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { and, eq, isNull } from "drizzle-orm";
import { EmailError } from "./errors.ts";
import type { EmailProvider, OutboundEmail } from "./provider.ts";
import { type EmailRow, selectEmailsWithMode, toEmailObject } from "./read.ts";
import { hashSendRequest } from "./request-hash.ts";
import type { EmailObjectOutput, SendEmailRequestOutput } from "./schemas.ts";

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

const { email } = schema;

function toOutbound(row: EmailRow): OutboundEmail {
  return {
    emailId: row.id,
    from: row.from,
    to: row.to,
    cc: row.cc,
    bcc: row.bcc,
    replyTo: row.replyTo,
    subject: row.subject,
    html: row.html,
    text: row.text,
    headers: row.headers,
    tags: row.tags,
  };
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
    if (row.status !== "queued") return toEmailObject(row, { sandbox });

    const provider = providerFor(sandbox);
    // Claim the email first so concurrent dispatchers (e.g. a future worker) never send it twice.
    // `provider` is only ever set by this claim. A crash after the claim leaves the row `queued`
    // with a provider: stale-claim recovery belongs to the async worker.
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
    try {
      const { providerMessageId } = await provider.send(toOutbound(row));
      outcome = { status: "sent", provider: provider.name, providerMessageId, sentAt: new Date() };
    } catch (error) {
      console.error(`[email] provider "${provider.name}" failed to send ${row.id}:`, error);
      outcome = {
        status: "failed",
        provider: provider.name,
        errorCode: "provider_error",
        errorMessage: errorMessage(error),
      };
    }

    // Still guarded on `queued` so a finished email is never overwritten.
    const [updated] = await db
      .update(email)
      .set(outcome)
      .where(
        and(
          eq(email.id, row.id),
          eq(email.organizationId, row.organizationId),
          eq(email.status, "queued"),
        ),
      )
      .returning();
    if (updated) return toEmailObject(updated, { sandbox });
    return currentEmail(row);
  }

  async function currentEmail(row: EmailRow): Promise<EmailObjectOutput> {
    const [current] = await selectEmailsWithMode(row.organizationId, eq(email.id, row.id), 1);
    if (!current) throw new EmailError("not_found", "Email not found.");
    return toEmailObject(current.email, { sandbox: current.sandbox });
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
      idempotencyKey,
      requestHash,
    } satisfies typeof email.$inferInsert;

    if (!idempotencyKey) {
      const [row] = await db.insert(email).values(values).returning();
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
    const insertOnce = (executor: Pick<typeof db, "insert"> = db) =>
      executor
        .insert(email)
        .values(values)
        .onConflictDoNothing({ target: [email.environmentId, email.idempotencyKey] })
        .returning();

    let [inserted] = await insertOnce();
    for (let attempt = 1; !inserted; attempt++) {
      if (attempt > MAX_IDEMPOTENCY_ATTEMPTS) {
        throw new EmailError("request_in_progress", "This idempotency key is busy. Retry shortly.");
      }
      const [existing] = await db.select().from(email).where(sameKey).limit(1);
      if (!existing) {
        // Its owner expired and released the key between our insert and select.
        [inserted] = await insertOnce();
        continue;
      }
      if (Date.now() - existing.createdAt.getTime() > IDEMPOTENCY_KEY_TTL_MS) {
        // Expired: move the key to a new email atomically. The compare-and-set on the old row
        // makes concurrent requests with the same expired key queue up behind each other.
        [inserted] = await db.transaction(async (tx) => {
          await tx
            .update(email)
            .set({ idempotencyKey: null })
            .where(and(eq(email.id, existing.id), eq(email.idempotencyKey, idempotencyKey)));
          return insertOnce(tx);
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
      return { email: toEmailObject(existing, { sandbox }), replayed: true };
    }
    return { email: await deliver(inserted, sandbox), replayed: false };
  }

  return { send, dispatch };
}
