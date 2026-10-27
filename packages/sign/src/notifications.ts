/**
 * Email delivery and expiry, run by the worker's `sign-notifications` loop: sent requests past
 * `expires_at` expire; email signers whose turn it is get their invitation, then reminders (every
 * `reminder_interval_days`, up to `MAX_SIGN_REMINDERS`, or when asked for); once the signed
 * document is sealed they get their copy. Every email carries a fresh signing link and a stable
 * idempotency key, and its signer row moves by compare-and-set, so a rerun after a crash never
 * sends twice. System-level: scans every organization (`scope` narrows it in tests).
 */
import { db, schema } from "@coss/db";
import { and, asc, eq, inArray, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { readSignedDocument } from "./complete.ts";
import { invitationEmail, reminderEmail, type SignMailer, signedCopyEmail } from "./emails.ts";
import { SignError } from "./errors.ts";
import type { SignActor } from "./events.ts";
import { recordSignEvent } from "./record.ts";
import { MAX_SIGN_REMINDERS } from "./schemas.ts";
import { mintSignSession } from "./sessions.ts";
import { getSignSettings, requesterName } from "./settings.ts";
import type { DocumentStore } from "./store.ts";

const { environment, signRequest, signSigner } = schema;

type RequestRow = typeof signRequest.$inferSelect;
type SignerRow = typeof signSigner.$inferSelect;

export type SignNotificationDeps = {
  mailer: SignMailer;
  /** Where signing links point (`SIGN_PUBLIC_URL`). */
  signUrl: string;
  /** Reads signed documents for the copies. */
  store: DocumentStore;
};

const DAY_MS = 86_400_000;
/** How long an emailed link works (reminders send fresh ones). */
const EMAIL_LINK_DAYS = 30;
/** Copies attach the PDF up to this size; bigger ones are a link only. */
const MAX_ATTACHED_COPY_BYTES = 10 * 1024 * 1024;
/** Asked-for reminders wait this long after the last email to a signer. */
export const REMINDER_COOLDOWN_MS = 60 * 60_000;

const SYSTEM: SignActor = { kind: "system" };

type Scope = { organizationIds: string[] } | undefined;

function scoped(scope: Scope) {
  return scope ? inArray(signRequest.organizationId, scope.organizationIds) : undefined;
}

/** Sequential order: nobody before this signer is still to sign. */
const signersTurn = sql`(${signRequest.signingOrder} = 'parallel' or not exists (
  select 1 from ${signSigner} as earlier
  where earlier.request_id = ${signSigner.requestId}
    and earlier.organization_id = ${signSigner.organizationId}
    and earlier.position < ${signSigner.position}
    and earlier.status <> 'signed'))`;

/** Expires sent requests past `expires_at`. */
async function expireDue(now: Date, limit: number, scope: Scope): Promise<number> {
  const due = await db
    .select({ id: signRequest.id, organizationId: signRequest.organizationId })
    .from(signRequest)
    .where(
      and(
        eq(signRequest.status, "sent"),
        isNotNull(signRequest.expiresAt),
        lte(signRequest.expiresAt, now),
        scoped(scope),
      ),
    )
    .orderBy(asc(signRequest.expiresAt))
    .limit(limit);
  for (const row of due) {
    await db.transaction(async (tx) => {
      const [expired] = await tx
        .update(signRequest)
        .set({ status: "expired", expiredAt: now })
        .where(
          and(
            eq(signRequest.id, row.id),
            eq(signRequest.organizationId, row.organizationId),
            eq(signRequest.status, "sent"),
          ),
        )
        .returning();
      if (!expired) return;
      const [env] = await tx
        .select({ mode: environment.mode })
        .from(environment)
        .where(eq(environment.id, expired.environmentId));
      await recordSignEvent(
        tx,
        { request: expired, sandbox: env?.mode === "sandbox" },
        { type: "expired", actor: SYSTEM, occurredAt: now },
      );
    });
  }
  return due.length;
}

type Due = { request: RequestRow; signer: SignerRow; sandbox: boolean };

async function dueSigners(condition: ReturnType<typeof and>, limit: number): Promise<Due[]> {
  const rows = await db
    .select({ request: signRequest, signer: signSigner, mode: environment.mode })
    .from(signSigner)
    .innerJoin(
      signRequest,
      and(
        eq(signRequest.id, signSigner.requestId),
        eq(signRequest.organizationId, signSigner.organizationId),
      ),
    )
    .innerJoin(
      environment,
      and(
        eq(environment.id, signRequest.environmentId),
        eq(environment.organizationId, signRequest.organizationId),
      ),
    )
    .where(and(eq(signSigner.delivery, "email"), condition))
    .orderBy(asc(signSigner.createdAt))
    .limit(limit);
  return rows.map((row) => ({
    request: row.request,
    signer: row.signer,
    sandbox: row.mode === "sandbox",
  }));
}

function environmentOf(request: RequestRow, sandbox: boolean) {
  return {
    organizationId: request.organizationId,
    projectId: request.projectId,
    environmentId: request.environmentId,
    mode: sandbox ? ("sandbox" as const) : ("live" as const),
  };
}

/** A fresh link for the signer, valid for `EMAIL_LINK_DAYS` (or until the request expires). */
async function emailLink(due: Due, deps: SignNotificationDeps, now: Date) {
  const days = new Date(now.getTime() + EMAIL_LINK_DAYS * DAY_MS);
  const expiry =
    due.request.expiresAt && due.request.expiresAt < days ? due.request.expiresAt : days;
  return mintSignSession({
    organizationId: due.request.organizationId,
    environmentId: due.request.environmentId,
    requestId: due.request.id,
    signerId: due.signer.id,
    signUrl: deps.signUrl,
    expiresAt: expiry,
    apiKeyId: null,
    now,
  });
}

async function sender(request: RequestRow) {
  const settings = await getSignSettings(request);
  return {
    from: settings.emailFrom,
    requester: await requesterName({ organizationId: request.organizationId, settings }),
  };
}

const OPEN_REQUEST = (now: Date) =>
  and(
    eq(signRequest.status, "sent"),
    or(isNull(signRequest.expiresAt), sql`${signRequest.expiresAt} > ${now}`),
  );

/** Invitations: email signers not yet notified, whose turn it is. */
async function invite(now: Date, limit: number, scope: Scope, deps: SignNotificationDeps) {
  const due = await dueSigners(
    and(
      OPEN_REQUEST(now),
      isNull(signSigner.notifiedAt),
      eq(signSigner.status, "pending"),
      signersTurn,
      scoped(scope),
    ),
    limit,
  );
  for (const item of due) {
    const { from, requester } = await sender(item.request);
    const link = await emailLink(item, deps, now);
    const content = invitationEmail({
      requester,
      title: item.request.title,
      // The requester's own words only go out under their own address (or nowhere: a sandbox).
      message: from || item.sandbox ? item.request.message : null,
      url: link.url,
      expiresAt: item.request.expiresAt,
    });
    await deps.mailer.send({
      environment: environmentOf(item.request, item.sandbox),
      from,
      requester,
      to: item.signer.email,
      ...content,
      idempotencyKey: `sign-invite:${item.signer.id}`,
    });
    await db.transaction(async (tx) => {
      const interval = item.request.reminderIntervalDays;
      const [signer] = await tx
        .update(signSigner)
        .set({
          status: "notified",
          notifiedAt: now,
          nextReminderAt: interval ? new Date(now.getTime() + interval * DAY_MS) : null,
        })
        .where(
          and(
            eq(signSigner.id, item.signer.id),
            eq(signSigner.organizationId, item.signer.organizationId),
            isNull(signSigner.notifiedAt),
          ),
        )
        .returning();
      if (!signer) return;
      await recordSignEvent(
        tx,
        { request: item.request, signer, sandbox: item.sandbox },
        { type: "notified", actor: SYSTEM, details: { session_id: link.id }, occurredAt: now },
      );
    });
  }
  return due.length;
}

/** Reminders: automatic ones when due (up to the limit), and asked-for ones. */
async function remind(now: Date, limit: number, scope: Scope, deps: SignNotificationDeps) {
  const due = await dueSigners(
    and(
      OPEN_REQUEST(now),
      inArray(signSigner.status, ["notified", "viewed"]),
      or(
        isNotNull(signSigner.remindRequestedAt),
        and(
          lte(signSigner.nextReminderAt, now),
          sql`${signSigner.reminderCount} < ${MAX_SIGN_REMINDERS}`,
        ),
      ),
      signersTurn,
      scoped(scope),
    ),
    limit,
  );
  for (const item of due) {
    const { from, requester } = await sender(item.request);
    const link = await emailLink(item, deps, now);
    const count = item.signer.reminderCount + 1;
    await deps.mailer.send({
      environment: environmentOf(item.request, item.sandbox),
      from,
      requester,
      to: item.signer.email,
      ...reminderEmail({
        requester,
        title: item.request.title,
        url: link.url,
        expiresAt: item.request.expiresAt,
      }),
      idempotencyKey: `sign-remind:${item.signer.id}:${count}`,
    });
    await db.transaction(async (tx) => {
      const interval = item.request.reminderIntervalDays;
      const [signer] = await tx
        .update(signSigner)
        .set({
          reminderCount: count,
          lastRemindedAt: now,
          remindRequestedAt: null,
          nextReminderAt:
            interval && count < MAX_SIGN_REMINDERS
              ? new Date(now.getTime() + interval * DAY_MS)
              : null,
        })
        .where(
          and(
            eq(signSigner.id, item.signer.id),
            eq(signSigner.organizationId, item.signer.organizationId),
            eq(signSigner.reminderCount, item.signer.reminderCount),
          ),
        )
        .returning();
      if (!signer) return;
      await recordSignEvent(
        tx,
        { request: item.request, signer, sandbox: item.sandbox },
        { type: "reminded", actor: SYSTEM, details: { session_id: link.id }, occurredAt: now },
      );
    });
  }
  return due.length;
}

/** Signed copies: email signers of sealed requests. */
async function sendCopies(now: Date, limit: number, scope: Scope, deps: SignNotificationDeps) {
  const due = await dueSigners(
    and(
      eq(signRequest.status, "completed"),
      isNotNull(signRequest.sealedAt),
      eq(signSigner.status, "signed"),
      isNull(signSigner.copySentAt),
      scoped(scope),
    ),
    limit,
  );
  for (const item of due) {
    const { from, requester } = await sender(item.request);
    const document = await readSignedDocument({
      organizationId: item.request.organizationId,
      environmentId: item.request.environmentId,
      requestId: item.request.id,
      store: deps.store,
    });
    const attached = document.content.length <= MAX_ATTACHED_COPY_BYTES;
    // The link opens the signing page's "signed" screen, which downloads the copy.
    const days = new Date(now.getTime() + EMAIL_LINK_DAYS * DAY_MS);
    const link = await mintSignSession({
      organizationId: item.request.organizationId,
      environmentId: item.request.environmentId,
      requestId: item.request.id,
      signerId: item.signer.id,
      signUrl: deps.signUrl,
      expiresAt: days,
      apiKeyId: null,
      now,
    });
    await deps.mailer.send({
      environment: environmentOf(item.request, item.sandbox),
      from,
      requester,
      to: item.signer.email,
      ...signedCopyEmail({ requester, title: item.request.title, url: link.url, attached }),
      idempotencyKey: `sign-copy:${item.signer.id}`,
      attachment: attached ? { filename: document.filename, content: document.content } : null,
    });
    await db
      .update(signSigner)
      .set({ copySentAt: now })
      .where(
        and(
          eq(signSigner.id, item.signer.id),
          eq(signSigner.organizationId, item.signer.organizationId),
          isNull(signSigner.copySentAt),
        ),
      );
  }
  return due.length;
}

/**
 * One pass: expiry, invitations, reminders, copies. A failed email is logged and retried on the
 * next pass. Returns how many things it handled.
 */
export async function runDueSignNotifications(
  opts: { limit: number; now?: Date; scope?: { organizationIds: string[] } },
  deps: SignNotificationDeps,
): Promise<number> {
  const now = opts.now ?? new Date();
  let handled = await expireDue(now, opts.limit, opts.scope);
  for (const step of [invite, remind, sendCopies]) {
    try {
      handled += await step(now, opts.limit, opts.scope, deps);
    } catch (error) {
      console.error(`[sign] ${step.name} failed:`, error);
    }
  }
  return handled;
}

/**
 * Asks for a reminder to every email signer of a sent request whose turn it is and who wasn't
 * emailed in the last hour (`reminder_not_due` when there is nobody). The worker sends it.
 */
export async function requestSignReminders(input: {
  organizationId: string;
  environmentId: string;
  requestId: string;
  now?: Date;
}): Promise<number> {
  const now = input.now ?? new Date();
  const [request] = await db
    .select()
    .from(signRequest)
    .where(
      and(
        eq(signRequest.id, input.requestId),
        eq(signRequest.organizationId, input.organizationId),
        eq(signRequest.environmentId, input.environmentId),
      ),
    )
    .limit(1);
  if (!request) {
    throw new SignError(
      "not_found",
      "No signature request with this id exists in this environment.",
    );
  }
  if (request.status !== "sent") {
    throw new SignError("reminder_not_due", `A ${request.status} request has nobody to remind.`);
  }
  const cutoff = new Date(now.getTime() - REMINDER_COOLDOWN_MS);
  const asked = await db
    .update(signSigner)
    .set({ remindRequestedAt: now })
    .where(
      and(
        eq(signSigner.requestId, request.id),
        eq(signSigner.organizationId, request.organizationId),
        eq(signSigner.delivery, "email"),
        inArray(signSigner.status, ["notified", "viewed"]),
        isNull(signSigner.remindRequestedAt),
        sql`greatest(${signSigner.notifiedAt}, coalesce(${signSigner.lastRemindedAt}, ${signSigner.notifiedAt})) <= ${cutoff}`,
        request.signingOrder === "sequential"
          ? sql`not exists (
              select 1 from ${signSigner} as earlier
              where earlier.request_id = ${request.id}
                and earlier.organization_id = ${request.organizationId}
                and earlier.position < ${signSigner.position}
                and earlier.status <> 'signed')`
          : undefined,
      ),
    )
    .returning({ id: signSigner.id });
  if (asked.length === 0) {
    throw new SignError(
      "reminder_not_due",
      "Nobody to remind: email signers who haven't signed get one at most once an hour, and embedded signers are yours to remind.",
    );
  }
  return asked.length;
}
