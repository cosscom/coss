/**
 * The notification outbox. A product calls `enqueueNotification(tx, …)` in the transaction that
 * decides an email is due (a number bought, a registration submitted or reviewed); the worker's
 * `notifications` loop sends it through a `Notifier` with the content and recipients its kind
 * resolves at send time, so an email whose news is stale by then is skipped, not sent.
 * System-level: the scan spans organizations, and every read and write is scoped by the row's own
 * organization.
 */
import { db, type Executor, schema } from "@coss/db";
import { type EmailContent, oneLine, renderEmail } from "@coss/email-layout";
import { and, asc, desc, eq, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { organizationAdmins } from "./recipients.ts";

const { notification, organization } = schema;

const MINUTE = 60 * 1000;
/** A claimed notification is not picked up by another worker for this long. */
export const NOTIFICATION_LEASE_MS = 5 * MINUTE;
/** Attempts before a notification is given up as `failed` (backoff 1, 2, 4… min, about 2 h). */
export const MAX_NOTIFICATION_ATTEMPTS = 8;
/** By default, older notifications are skipped rather than sent late. */
export const DEFAULT_NOTIFICATION_MAX_AGE_MS = 3 * 24 * 60 * MINUTE;

export type NotificationRow = typeof notification.$inferSelect;

/** One email to one person. */
export type Notice = {
  /** Stable per notification and recipient: senders pass it as their idempotency key. */
  idempotencyKey: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};

/** Delivers a notice; throws when it could not (the notification is retried). */
export type Notifier = { send(notice: Notice): Promise<void> };

export type NotificationRecipient = { userId: string; email: string };

/** What a kind renders from. */
export type NotificationContext = {
  organizationId: string;
  organization: { name: string; slug: string };
  payload: Record<string, unknown>;
  createdAt: Date;
  now: Date;
  /** A dashboard URL for `path` (`/acme/sms`). */
  url(path: string): string;
};

/** A notification's content, or why it is no longer worth sending (the news moved on). */
export type NotificationContent = EmailContent | { skip: string };

export type NotificationKind = {
  render(context: NotificationContext): NotificationContent | Promise<NotificationContent>;
  /** Who gets it; default the organization's owners and admins with a verified address. */
  recipients?(context: NotificationContext): Promise<NotificationRecipient[]>;
  /** Older ones are skipped; default `DEFAULT_NOTIFICATION_MAX_AGE_MS`. */
  maxAgeMs?: number;
};

/** Every kind the worker can send, by name (`sms.registration_approved`). */
export type NotificationKinds = Readonly<Record<string, NotificationKind>>;

export type NotificationDeps = {
  notifier: Notifier;
  kinds: NotificationKinds;
  /** Origin of the dashboard, for links (`BETTER_AUTH_URL`). */
  dashboardUrl: string;
};

/** Development only: prints notices to the console, like the dev auth emails. */
export const logNotifier: Notifier = {
  async send(notice) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("[notifications] No notification sender configured in production.");
    }
    console.info(`\n[notifications] Email to ${notice.to}: ${notice.subject}\n\n${notice.text}\n`);
  },
};

/**
 * Queues a notification in the caller's transaction, once per `dedupeKey` (within its kind and
 * organization). `notBefore` delays it: a reminder that is skipped if the step is done by then.
 * Returns whether it is new.
 */
export async function enqueueNotification(
  tx: Executor,
  input: {
    organizationId: string;
    kind: string;
    dedupeKey: string;
    payload?: Record<string, unknown>;
    notBefore?: Date;
    now?: Date;
  },
): Promise<boolean> {
  const now = input.now ?? new Date();
  const inserted = await tx
    .insert(notification)
    .values({
      organizationId: input.organizationId,
      kind: input.kind,
      dedupeKey: `${input.kind}:${input.dedupeKey}`,
      payload: input.payload ?? {},
      nextAttemptAt: input.notBefore && input.notBefore > now ? input.notBefore : now,
      createdAt: now,
    })
    .onConflictDoNothing({ target: [notification.organizationId, notification.dedupeKey] })
    .returning({ id: notification.id });
  return inserted.length > 0;
}

/** The organization's notifications, newest first (tests and admin tooling). */
export async function listNotifications(organizationId: string): Promise<NotificationRow[]> {
  return db
    .select()
    .from(notification)
    .where(eq(notification.organizationId, organizationId))
    .orderBy(desc(notification.createdAt), desc(notification.id));
}

/** Backoff after the `attempt`-th failed attempt (1-based): 1, 2, 4… minutes, at most an hour. */
function retryDelayMs(attempt: number): number {
  return Math.min(2 ** (attempt - 1) * MINUTE, 60 * MINUTE);
}

/**
 * Sends notifications that are due, oldest first. Returns how many were claimed. `scope` limits
 * the scan to some organizations (tests).
 */
export async function runDueNotifications(
  opts: { now?: Date; limit?: number; scope?: { organizationIds: string[] } },
  deps: NotificationDeps,
): Promise<number> {
  const now = opts.now ?? new Date();
  const due = and(
    eq(notification.status, "pending"),
    isNotNull(notification.nextAttemptAt),
    lte(notification.nextAttemptAt, now),
  );
  const candidates = await db
    .select({ id: notification.id })
    .from(notification)
    .where(
      and(
        due,
        opts.scope ? inArray(notification.organizationId, opts.scope.organizationIds) : undefined,
      ),
    )
    .orderBy(asc(notification.nextAttemptAt))
    .limit(opts.limit ?? 20);

  let claimed = 0;
  for (const candidate of candidates) {
    const [row] = await db
      .update(notification)
      .set({
        attemptCount: sql`${notification.attemptCount} + 1`,
        nextAttemptAt: new Date(now.getTime() + NOTIFICATION_LEASE_MS),
      })
      .where(and(due, eq(notification.id, candidate.id)))
      .returning();
    if (!row) continue;
    claimed++;
    await deliver(row, deps, now);
  }
  return claimed;
}

async function deliver(row: NotificationRow, deps: NotificationDeps, now: Date): Promise<void> {
  const thisRow = and(
    eq(notification.id, row.id),
    eq(notification.organizationId, row.organizationId),
  );
  const settle = (values: Partial<typeof notification.$inferInsert>) =>
    db
      .update(notification)
      .set({ nextAttemptAt: null, ...values })
      .where(thisRow);
  try {
    // A kind this worker doesn't know yet (an older worker during a deploy): retried.
    const kind = deps.kinds[row.kind];
    if (!kind) throw new Error(`Unknown notification kind "${row.kind}".`);
    if (
      now.getTime() - row.createdAt.getTime() >
      (kind.maxAgeMs ?? DEFAULT_NOTIFICATION_MAX_AGE_MS)
    ) {
      await settle({ status: "skipped", lastError: "Too old to send." });
      return;
    }
    const [org] = await db
      .select({ name: organization.name, slug: organization.slug })
      .from(organization)
      .where(eq(organization.id, row.organizationId));
    if (!org) {
      await settle({ status: "skipped", lastError: "The organization is gone." });
      return;
    }
    const context: NotificationContext = {
      organizationId: row.organizationId,
      organization: org,
      payload: row.payload,
      createdAt: row.createdAt,
      now,
      url: (path) => new URL(path, deps.dashboardUrl).toString(),
    };
    const content = await kind.render(context);
    if ("skip" in content) {
      await settle({ status: "skipped", lastError: content.skip });
      return;
    }
    const recipients = kind.recipients
      ? await kind.recipients(context)
      : await organizationAdmins(row.organizationId);
    if (!recipients.length) {
      await settle({ status: "skipped", lastError: "Nobody with a verified email address." });
      return;
    }
    const message = renderEmail({
      ...content,
      reason:
        content.reason ??
        `You're receiving this because you're an owner or admin of ${oneLine(org.name)} on coss.com.`,
    });
    for (const recipient of recipients) {
      await deps.notifier.send({
        idempotencyKey: `${row.id}:${recipient.userId}`,
        to: recipient.email,
        ...message,
      });
    }
    await settle({
      status: "sent",
      recipients: recipients.map((recipient) => recipient.email),
      sentAt: now,
      lastError: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[notifications] ${row.kind} ${row.id} (${row.organizationId}) failed:`, error);
    if (row.attemptCount >= MAX_NOTIFICATION_ATTEMPTS) {
      await settle({ status: "failed", lastError: message });
    } else {
      await db
        .update(notification)
        .set({
          nextAttemptAt: new Date(now.getTime() + retryDelayMs(row.attemptCount)),
          lastError: message,
        })
        .where(thisRow);
    }
  }
}
