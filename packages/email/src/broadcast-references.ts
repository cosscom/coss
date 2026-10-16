/**
 * What unfinished broadcasts refer to: their audience, segment or topic can't be deleted until
 * they are sent or canceled (a broadcast would otherwise fail halfway).
 */
import { db, schema } from "@coss/db";
import { and, eq, inArray } from "drizzle-orm";
import type { ContactEnvironment } from "./contact-properties.ts";
import { ContactError } from "./errors.ts";

const { broadcast } = schema;

const UNFINISHED = ["draft", "scheduled", "sending", "paused"] as const;

/** Throws `<kind>_in_use` while an unfinished broadcast of the environment uses the reference. */
export async function assertNoBroadcastUses(
  env: ContactEnvironment,
  reference: { audienceId: string } | { segmentId: string } | { topic: string },
): Promise<void> {
  const [kind, condition] =
    "audienceId" in reference
      ? (["audience", eq(broadcast.audienceId, reference.audienceId)] as const)
      : "segmentId" in reference
        ? (["segment", eq(broadcast.segmentId, reference.segmentId)] as const)
        : (["topic", eq(broadcast.topic, reference.topic)] as const);
  const [used] = await db
    .select({ name: broadcast.name })
    .from(broadcast)
    .where(
      and(
        eq(broadcast.organizationId, env.organizationId),
        eq(broadcast.environmentId, env.environmentId),
        inArray(broadcast.status, [...UNFINISHED]),
        condition,
      ),
    )
    .limit(1);
  if (used) {
    throw new ContactError(
      `${kind}_in_use`,
      `The broadcast "${used.name}" uses this ${kind}: send, cancel or change it first.`,
    );
  }
}
