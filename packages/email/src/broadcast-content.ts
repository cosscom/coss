/**
 * A broadcast email stores no body: its content is the broadcast's, rendered with the email's
 * `variables` snapshot, at dispatch and on every read. Broadcast content is frozen once it starts
 * sending, so dispatch keeps a small per-process cache of it.
 */
import { db, schema } from "@coss/db";
import { and, eq, inArray } from "drizzle-orm";
import { type BroadcastContent, renderBroadcast } from "./broadcast-render.ts";
import type { EmailRow } from "./read.ts";

const { broadcast } = schema;

/** The broadcasts' content, by id (one organization). */
export async function broadcastContents(
  organizationId: string,
  ids: readonly string[],
): Promise<Map<string, BroadcastContent>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const rows = await db
    .select({
      id: broadcast.id,
      subject: broadcast.subject,
      html: broadcast.html,
      text: broadcast.text,
      previewText: broadcast.previewText,
    })
    .from(broadcast)
    .where(and(eq(broadcast.organizationId, organizationId), inArray(broadcast.id, unique)));
  return new Map(rows.map(({ id, ...content }) => [id, content]));
}

/** The row with its broadcast's body filled in (other rows as they are). */
export function withRenderedBody<
  T extends Pick<EmailRow, "broadcastId" | "variables" | "html" | "text">,
>(row: T, contents: ReadonlyMap<string, BroadcastContent>): T {
  const content = row.broadcastId ? contents.get(row.broadcastId) : undefined;
  if (!content) return row;
  const rendered = renderBroadcast(content, row.variables ?? {});
  return { ...row, html: rendered.html, text: rendered.text };
}

const CACHE_SIZE = 64;

/** A per-process cache of broadcast content for dispatch (least recently used out). */
export function broadcastContentCache(): (
  organizationId: string,
  broadcastId: string,
) => Promise<BroadcastContent | null> {
  const cache = new Map<string, BroadcastContent>();
  return async (organizationId, broadcastId) => {
    const cached = cache.get(broadcastId);
    if (cached) {
      cache.delete(broadcastId);
      cache.set(broadcastId, cached);
      return cached;
    }
    const content = (await broadcastContents(organizationId, [broadcastId])).get(broadcastId);
    if (!content) return null;
    cache.set(broadcastId, content);
    if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value as string);
    return content;
  };
}
