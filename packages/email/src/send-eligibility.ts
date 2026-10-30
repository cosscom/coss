/**
 * Who a send skips, at acceptance and again when a scheduled send is claimed: the suppression
 * list (deliverability), and contacts' consent (`contact.status` and topic choices). One function
 * for both, so every write path applies the same rules.
 *
 * - Transactional email: suppressions (`*`, the category), plus contacts who explicitly opted
 *   out of the topic whose key is the email's category. A contact's overall `unsubscribed` status
 *   is about marketing and never stops a password reset.
 * - Email sent for a sub-account: its suppressions and the environment's, never contacts (they
 *   are the environment's own audience).
 * - Marketing email: suppressions (`*`, `stream:marketing`, the category), plus contacts that
 *   aren't `subscribed` and contacts the topic doesn't reach (no opt-out of an opt-in topic; an
 *   opt-in to an opt-out topic). Addresses that are no contact are sent (the sender vouches for
 *   their consent) unless suppressed.
 */
import type { Executor } from "@coss/db";
import { schema } from "@coss/db";
import { and, eq, inArray } from "drizzle-orm";
import type { EmailStream } from "./schemas.ts";
import {
  type SuppressionEnvironment,
  type SuppressionRow,
  suppressedRecipients,
} from "./suppressions.ts";

const { contact, contactTopic, topic } = schema;

export type Skip =
  | { kind: "suppressed"; entry: SuppressionRow }
  | { kind: "unsubscribed"; contactId: string | null; topic: string | null };

export async function skippedRecipients(
  tx: Executor,
  env: SuppressionEnvironment,
  addresses: string[],
  opts: { category: string | null; stream: EmailStream },
): Promise<Map<string, Skip>> {
  const skips = new Map<string, Skip>();
  if (addresses.length === 0) return skips;
  for (const [address, entry] of await suppressedRecipients(
    tx,
    env,
    addresses,
    opts.category,
    opts.stream,
  )) {
    skips.set(address, { kind: "suppressed", entry });
  }
  const remaining = addresses.filter((address) => !skips.has(address));
  // Contacts are the environment's own audience: a sub-account's mail answers only to its
  // suppressions (and the environment's).
  if (remaining.length === 0 || env.subaccountId) return skips;
  const marketing = opts.stream === "marketing";
  const [topicRow] = opts.category
    ? await tx
        .select({ id: topic.id, key: topic.key, defaultSubscription: topic.defaultSubscription })
        .from(topic)
        .where(
          and(
            eq(topic.organizationId, env.organizationId),
            eq(topic.environmentId, env.environmentId),
            eq(topic.key, opts.category),
          ),
        )
        .limit(1)
    : [];
  if (!marketing && !topicRow) return skips;
  const contacts = await tx
    .select({
      id: contact.id,
      address: contact.address,
      status: contact.status,
      choice: contactTopic.status,
    })
    .from(contact)
    .leftJoin(
      contactTopic,
      and(
        eq(contactTopic.contactId, contact.id),
        eq(contactTopic.organizationId, contact.organizationId),
        eq(contactTopic.topicId, topicRow?.id ?? ""),
      ),
    )
    .where(
      and(
        eq(contact.organizationId, env.organizationId),
        eq(contact.environmentId, env.environmentId),
        inArray(contact.address, remaining),
      ),
    );
  for (const row of contacts) {
    let skip = false;
    if (marketing) {
      skip =
        row.status !== "subscribed" ||
        (topicRow !== undefined &&
          (topicRow.defaultSubscription === "opt_in"
            ? row.choice === "opted_out"
            : row.choice !== "opted_in"));
    } else {
      skip = row.choice === "opted_out";
    }
    if (skip) {
      skips.set(row.address, {
        kind: "unsubscribed",
        contactId: row.id,
        topic: topicRow && row.status === "subscribed" ? topicRow.key : null,
      });
    }
  }
  return skips;
}
