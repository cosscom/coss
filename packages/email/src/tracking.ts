/**
 * Records opens and clicks from COSS's public tracking endpoints. System-level: the email is
 * resolved from its unguessable tracking token (never from the caller), and every write is scoped
 * by that email's organization. Hits within the same minute (per link) collapse into one event.
 */
import { randomBytes } from "node:crypto";
import { db, schema } from "@coss/db";
import { and, eq, ne, sql } from "drizzle-orm";
import { COSS_EVENT_SOURCE, recordProviderEvent } from "./events.ts";
import type { ProviderEvent } from "./provider.ts";

const { email, emailLink, emailRecipient } = schema;

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;
const USER_AGENT_MAX_LENGTH = 512;
const DEDUPE_WINDOW_MS = 60_000;

/** A new tracking token: 24 random bytes, base64url (32 characters). */
export function newTrackingToken(): string {
  return randomBytes(24).toString("base64url");
}

export function isTrackingToken(value: string): boolean {
  return TOKEN_PATTERN.test(value);
}

type Hit = { token: string; userAgent: string | null; now?: Date };

type TrackedEmail = {
  id: string;
  organizationId: string;
  trackOpens: boolean;
  trackClicks: boolean;
};

async function findTrackedEmail(token: string): Promise<TrackedEmail | null> {
  if (!isTrackingToken(token)) return null;
  const [row] = await db
    .select({
      id: email.id,
      organizationId: email.organizationId,
      trackOpens: email.trackOpens,
      trackClicks: email.trackClicks,
    })
    .from(email)
    .where(eq(email.trackingToken, token))
    .limit(1);
  return row ?? null;
}

/**
 * The recipient a hit can be attributed to: providers send one message to every recipient, so
 * only an email with a single (non-suppressed) recipient tells who opened or clicked.
 */
async function soleRecipient(target: TrackedEmail): Promise<string[] | null> {
  const rows = await db
    .select({ address: emailRecipient.address })
    .from(emailRecipient)
    .where(
      and(
        eq(emailRecipient.organizationId, target.organizationId),
        eq(emailRecipient.emailId, target.id),
        ne(emailRecipient.status, "suppressed"),
      ),
    )
    .limit(2);
  return rows.length === 1 && rows[0] ? [rows[0].address] : null;
}

function cleanUserAgent(value: string | null): string | null {
  return value?.slice(0, USER_AGENT_MAX_LENGTH) || null;
}

function windowOf(now: Date): string {
  return String(Math.floor(now.getTime() / DEDUPE_WINDOW_MS));
}

function trackingEvent(
  target: TrackedEmail,
  fields: Pick<ProviderEvent, "type" | "providerEventType" | "sourceId" | "data" | "recipients">,
  now: Date,
): ProviderEvent {
  return {
    provider: COSS_EVENT_SOURCE,
    emailId: target.id,
    providerMessageId: null,
    occurredAt: now,
    ...fields,
  };
}

/** Records an open pixel hit. Returns whether a new event was recorded. */
export async function recordOpen(hit: Hit): Promise<boolean> {
  const now = hit.now ?? new Date();
  const target = await findTrackedEmail(hit.token);
  if (!target?.trackOpens) return false;
  const event = trackingEvent(
    target,
    {
      type: "email.opened",
      providerEventType: "Open",
      sourceId: windowOf(now),
      recipients: await soleRecipient(target),
      data: { open: { user_agent: cleanUserAgent(hit.userAgent) } },
    },
    now,
  );
  return db.transaction(async (tx) => {
    const inserted = await recordProviderEvent(tx, event);
    if (inserted.length === 0) return false;
    const at = now.toISOString();
    await tx
      .update(email)
      .set({
        openCount: sql`${email.openCount} + 1`,
        firstOpenedAt: sql`coalesce(${email.firstOpenedAt}, ${at}::timestamptz)`,
        lastOpenedAt: sql`greatest(${email.lastOpenedAt}, ${at}::timestamptz)`,
      })
      .where(and(eq(email.id, target.id), eq(email.organizationId, target.organizationId)));
    return true;
  });
}

/**
 * Records a click on a tracked link and returns where to send the recipient: always a URL stored
 * when the email was sent, so the redirect can never be pointed elsewhere. `null` for unknown
 * tokens and links.
 */
export async function recordClick(
  hit: Hit & {
    position: number /** `false` only resolves the link (e.g. for HEAD). */;
    record?: boolean;
  },
): Promise<string | null> {
  const now = hit.now ?? new Date();
  if (!Number.isSafeInteger(hit.position) || hit.position < 0) return null;
  const target = await findTrackedEmail(hit.token);
  if (!target?.trackClicks) return null;
  const linkScope = and(
    eq(emailLink.organizationId, target.organizationId),
    eq(emailLink.emailId, target.id),
    eq(emailLink.position, hit.position),
  );
  const [link] = await db.select({ url: emailLink.url }).from(emailLink).where(linkScope).limit(1);
  if (!link) return null;
  if (hit.record === false) return link.url;
  const event = trackingEvent(
    target,
    {
      type: "email.clicked",
      providerEventType: "Click",
      sourceId: `${windowOf(now)}:${hit.position}`,
      recipients: await soleRecipient(target),
      data: {
        click: {
          url: link.url,
          link_position: hit.position,
          user_agent: cleanUserAgent(hit.userAgent),
        },
      },
    },
    now,
  );
  try {
    await db.transaction(async (tx) => {
      const inserted = await recordProviderEvent(tx, event);
      if (inserted.length === 0) return;
      const at = now.toISOString();
      const counted = {
        clickCount: sql`${email.clickCount} + 1`,
        firstClickedAt: sql`coalesce(${email.firstClickedAt}, ${at}::timestamptz)`,
        lastClickedAt: sql`greatest(${email.lastClickedAt}, ${at}::timestamptz)`,
      };
      await tx
        .update(email)
        .set(counted)
        .where(and(eq(email.id, target.id), eq(email.organizationId, target.organizationId)));
      await tx
        .update(emailLink)
        .set({
          clickCount: sql`${emailLink.clickCount} + 1`,
          firstClickedAt: sql`coalesce(${emailLink.firstClickedAt}, ${at}::timestamptz)`,
          lastClickedAt: sql`greatest(${emailLink.lastClickedAt}, ${at}::timestamptz)`,
        })
        .where(linkScope);
    });
  } catch (error) {
    // The recipient still gets where they were going.
    console.error(`[email:tracking] failed to record a click on ${target.id}:`, error);
  }
  return link.url;
}
