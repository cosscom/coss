/**
 * Billing emails (usage alerts, payment failures, holds, invoices COSS sends itself): queued in
 * the transaction that decides them (`enqueueBillingNotification`, once per `dedupe_key`), sent
 * by the worker through a `BillingNotifier` (the email product, wired by the worker). They go to
 * the account's billing email (and cc), else to the organization's owners and admins.
 */
import { db, type Executor, schema } from "@coss/db";
import { enqueuePush, type PushKind } from "@coss/push";
import { and, asc, eq, inArray, isNotNull, isNull, lte, ne, or, sql } from "drizzle-orm";
import { formatCents } from "./money.ts";

const { billingAccount, billingInvoice, billingNotification, member, organization, user } = schema;

const MINUTE = 60 * 1000;
export const BILLING_NOTIFICATION_LEASE_MS = 5 * MINUTE;
export const MAX_BILLING_NOTIFICATION_ATTEMPTS = 8;
/** Older notifications are skipped rather than sent late. */
export const MAX_BILLING_NOTIFICATION_AGE_MS = 3 * 24 * 60 * MINUTE;
const NOTIFIED_ROLES = ["owner", "admin"];

export type BillingNotificationKind =
  | "usage_threshold"
  | "spend_limit_reached"
  | "payment_failed"
  | "payment_action_required"
  | "invoice_issued"
  | "invoice_reminder"
  | "hold_placed"
  | "hold_lifted"
  | "contract_ending";

/** One email to one address. */
export type BillingNotice = {
  idempotencyKey: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};

/** Delivers a notice; throws when it could not (the notification is retried). */
export type BillingNotifier = { send(notice: BillingNotice): Promise<void> };

export type BillingNotificationDeps = {
  notifier: BillingNotifier;
  /** Origin of the dashboard, for links. */
  dashboardUrl: string;
};

/** Development only: prints notices to the console. */
export const logBillingNotifier: BillingNotifier = {
  async send(notice) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("[billing] No notification sender configured in production.");
    }
    console.info(`\n[billing] Email to ${notice.to}: ${notice.subject}\n\n${notice.text}\n`);
  },
};

export async function enqueueBillingNotification(
  tx: Executor,
  input: {
    organizationId: string;
    kind: BillingNotificationKind;
    dedupeKey: string;
    payload: Record<string, unknown>;
    now?: Date;
  },
): Promise<boolean> {
  const now = input.now ?? new Date();
  // Final invoices outlive their organization: nobody is left to tell (and the row's FK needs it).
  const [org] = await tx
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.id, input.organizationId));
  if (!org) return false;
  const inserted = await tx
    .insert(billingNotification)
    .values({
      organizationId: input.organizationId,
      kind: input.kind,
      dedupeKey: input.dedupeKey,
      payload: input.payload,
      nextAttemptAt: now,
      createdAt: now,
    })
    .onConflictDoNothing({ target: billingNotification.dedupeKey })
    .returning({ id: billingNotification.id });
  // Whether it is new (each dedupe key is sent once).
  if (!inserted.length) return false;
  const push = PUSHED[input.kind];
  if (push) {
    await enqueuePush(tx, {
      organizationId: input.organizationId,
      kind: push.kind,
      subjectId: push.subject(input.payload),
      now,
    });
  }
  return true;
}

/** Billing notifications that are also pushed to the iOS app: the ones that stop or risk sending. */
const PUSHED: Partial<
  Record<
    BillingNotificationKind,
    { kind: PushKind; subject(payload: Record<string, unknown>): string }
  >
> = {
  payment_failed: {
    kind: "billing_payment_failed",
    subject: (payload) => String(payload.invoiceId),
  },
  hold_placed: { kind: "billing_hold_placed", subject: () => "delinquent" },
  spend_limit_reached: { kind: "billing_hold_placed", subject: () => "spend_limit" },
};

export async function listBillingNotifications(organizationId: string) {
  return db
    .select()
    .from(billingNotification)
    .where(eq(billingNotification.organizationId, organizationId))
    .orderBy(asc(billingNotification.createdAt));
}

function retryDelayMs(attempt: number): number {
  return Math.min(2 ** (attempt - 1) * MINUTE, 60 * MINUTE);
}

type NotificationRow = typeof billingNotification.$inferSelect;

export async function runDueBillingNotifications(
  opts: { now?: Date; limit?: number; scope?: { organizationIds: string[] } },
  deps: BillingNotificationDeps,
): Promise<number> {
  const now = opts.now ?? new Date();
  const due = and(
    eq(billingNotification.status, "pending"),
    isNotNull(billingNotification.nextAttemptAt),
    lte(billingNotification.nextAttemptAt, now),
  );
  const candidates = await db
    .select({ id: billingNotification.id })
    .from(billingNotification)
    .where(
      and(
        due,
        opts.scope
          ? inArray(billingNotification.organizationId, opts.scope.organizationIds)
          : undefined,
      ),
    )
    .orderBy(asc(billingNotification.nextAttemptAt))
    .limit(opts.limit ?? 20);
  let claimed = 0;
  for (const candidate of candidates) {
    const [row] = await db
      .update(billingNotification)
      .set({
        attemptCount: sql`${billingNotification.attemptCount} + 1`,
        nextAttemptAt: new Date(now.getTime() + BILLING_NOTIFICATION_LEASE_MS),
      })
      .where(and(due, eq(billingNotification.id, candidate.id)))
      .returning();
    if (!row) continue;
    claimed++;
    await deliver(row, deps, now);
  }
  return claimed;
}

async function deliver(row: NotificationRow, deps: BillingNotificationDeps, now: Date) {
  const thisRow = and(
    eq(billingNotification.id, row.id),
    eq(billingNotification.organizationId, row.organizationId),
  );
  const settle = (values: Partial<typeof billingNotification.$inferInsert>) =>
    db
      .update(billingNotification)
      .set({ nextAttemptAt: null, ...values })
      .where(thisRow);
  try {
    if (now.getTime() - row.createdAt.getTime() > MAX_BILLING_NOTIFICATION_AGE_MS) {
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
    const recipients = await recipientsOf(row.organizationId);
    if (!recipients.length) {
      await settle({ status: "skipped", lastError: "Nobody to send it to." });
      return;
    }
    const message = await renderBillingNotification(row, org, deps.dashboardUrl);
    for (const to of recipients) {
      await deps.notifier.send({ idempotencyKey: `${row.id}:${to}`, to, ...message });
    }
    await settle({ status: "sent", recipients, sentAt: now, lastError: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[billing] notification ${row.id} (${row.organizationId}) failed:`, error);
    if (row.attemptCount >= MAX_BILLING_NOTIFICATION_ATTEMPTS) {
      await settle({ status: "failed", lastError: message });
    } else {
      await db
        .update(billingNotification)
        .set({
          nextAttemptAt: new Date(now.getTime() + retryDelayMs(row.attemptCount)),
          lastError: message,
        })
        .where(thisRow);
    }
  }
}

/** The account's billing email and cc, else verified owners and admins. */
async function recipientsOf(organizationId: string): Promise<string[]> {
  const [account] = await db
    .select({ email: billingAccount.billingEmail, cc: billingAccount.billingCc })
    .from(billingAccount)
    .where(eq(billingAccount.organizationId, organizationId));
  if (account?.email) return [...new Set([account.email, ...account.cc])];
  const rows = await db
    .select({ email: user.email })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(
      and(
        eq(member.organizationId, organizationId),
        sql`string_to_array(${member.role}, ',') && ARRAY[${sql.join(
          NOTIFIED_ROLES.map((role) => sql`${role}`),
          sql`, `,
        )}]::text[]`,
        eq(user.emailVerified, true),
        or(isNull(user.banned), ne(user.banned, true)),
      ),
    )
    .orderBy(asc(member.createdAt));
  return [...new Set([...rows.map((row) => row.email), ...(account?.cc ?? [])])];
}

type Block = { paragraph: string } | { list: string[] } | { link: { label: string; url: string } };
type Message = Pick<BillingNotice, "subject" | "text" | "html">;

function oneLine(value: string): string {
  return value
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

async function renderBillingNotification(
  row: NotificationRow,
  org: { name: string; slug: string },
  dashboardUrl: string,
): Promise<Message> {
  const payload = row.payload as Record<string, string | number | undefined>;
  const name = org.name;
  const billingUrl = new URL(`/${org.slug}/settings/billing`, dashboardUrl).toString();
  const blocks: Block[] = [];
  let subject: string;
  const invoice = payload.invoiceId
    ? (
        await db
          .select()
          .from(billingInvoice)
          .where(
            and(
              eq(billingInvoice.id, String(payload.invoiceId)),
              eq(billingInvoice.organizationId, row.organizationId),
            ),
          )
      )[0]
    : undefined;
  const invoiceLabel = invoice?.number ?? "your invoice";
  const due = invoice ? formatCents(invoice.amountDueCents) : "";
  switch (row.kind as BillingNotificationKind) {
    case "usage_threshold": {
      subject = `${name} has used ${payload.percent}% of this month's ${payload.what}`;
      blocks.push({
        paragraph: `${name} has used ${payload.percent}% of its ${payload.what} for ${payload.period}.`,
      });
      blocks.push({
        paragraph:
          payload.blocked === "true"
            ? "Usage stops at the limit until the next billing period. Upgrade to keep sending."
            : "Usage beyond your plan's credit is billed at your plan's rates.",
      });
      break;
    }
    case "spend_limit_reached":
      subject = `Live sending is paused: ${name} reached its spend limit`;
      blocks.push({
        paragraph: `${name}'s usage beyond its plan credit reached its spend limit of ${payload.limit}. Live sending is paused until the next billing period, or until an owner raises the limit.`,
      });
      break;
    case "payment_failed":
      subject = `Payment failed for ${invoiceLabel} (${name})`;
      blocks.push({
        paragraph: `We couldn't collect ${due} for ${invoiceLabel}${payload.error ? `: ${payload.error}` : "."} We'll try again; please check your payment method.`,
      });
      break;
    case "payment_action_required":
      subject = `Confirm your payment for ${invoiceLabel} (${name})`;
      blocks.push({
        paragraph: `Your bank needs you to confirm the payment of ${due} for ${invoiceLabel}.`,
      });
      if (invoice?.hostedUrl)
        blocks.push({ link: { label: "Confirm the payment", url: invoice.hostedUrl } });
      break;
    case "invoice_issued":
      subject = `Invoice ${invoiceLabel} from COSS (${name})`;
      blocks.push({
        paragraph: `Invoice ${invoiceLabel} for ${due} is due ${invoice?.dueAt?.toISOString().slice(0, 10) ?? "now"}.`,
      });
      if (invoice?.hostedUrl)
        blocks.push({ link: { label: "View and pay the invoice", url: invoice.hostedUrl } });
      break;
    case "invoice_reminder":
      subject = `Reminder: ${invoiceLabel} is ${payload.overdue === "true" ? "overdue" : "due soon"} (${name})`;
      blocks.push({
        paragraph: `${invoiceLabel} for ${due} ${payload.overdue === "true" ? "is overdue" : `is due ${invoice?.dueAt?.toISOString().slice(0, 10) ?? "soon"}`}.`,
      });
      if (invoice?.hostedUrl)
        blocks.push({ link: { label: "Pay the invoice", url: invoice.hostedUrl } });
      break;
    case "hold_placed":
      subject = `Live sending is paused for ${name}: an invoice is overdue`;
      blocks.push({
        paragraph: `${invoiceLabel} is overdue, so live sending for ${name} is paused. Sandbox keys still work, and scheduled emails are held, not lost. Sending resumes as soon as the invoice is paid.`,
      });
      break;
    case "hold_lifted":
      subject = `Live sending has resumed for ${name}`;
      blocks.push({
        paragraph: `Thanks — nothing is overdue anymore, so live sending for ${name} has resumed.`,
      });
      break;
    case "contract_ending":
      subject = `${name}'s contract ends on ${payload.endsOn}`;
      blocks.push({
        paragraph: `${name}'s contract ends on ${payload.endsOn}. After that, ${payload.next}. Contact your account manager to renew.`,
      });
      break;
    default:
      subject = `Billing update for ${name}`;
  }
  blocks.push({ link: { label: "Open billing", url: billingUrl } });
  blocks.push({
    paragraph: `You're receiving this because you're the billing contact, an owner or an admin of ${name} on COSS.`,
  });
  subject = oneLine(subject);
  return { subject, text: toText(blocks), html: toHtml(subject, blocks) };
}

function toText(blocks: Block[]): string {
  return blocks
    .map((block) => {
      if ("paragraph" in block) return block.paragraph;
      if ("list" in block) return block.list.map((item) => `- ${item}`).join("\n");
      return `${block.link.label}: ${block.link.url}`;
    })
    .join("\n\n");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toHtml(subject: string, blocks: Block[]): string {
  const body = blocks
    .map((block) => {
      if ("paragraph" in block) return `<p>${escapeHtml(block.paragraph)}</p>`;
      if ("list" in block) {
        return `<ul>${block.list.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
      }
      return `<p><a href="${escapeHtml(block.link.url)}">${escapeHtml(block.link.label)}</a></p>`;
    })
    .join("\n");
  return (
    `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>` +
    `<body style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#111">\n${body}\n</body></html>`
  );
}
