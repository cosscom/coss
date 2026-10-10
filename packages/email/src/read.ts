/** Read side of the email product. Needs no providers, so the dashboard can use it directly. */
import { db, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { and, desc, eq, type SQL, sql } from "drizzle-orm";
import type { EmailObjectOutput } from "./schemas.ts";

export type EmailRow = typeof schema.email.$inferSelect;

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;

const { email, environment } = schema;

export function toEmailObject(row: EmailRow, opts: { sandbox: boolean }): EmailObjectOutput {
  return {
    object: "email",
    id: row.id,
    from: row.from,
    to: row.to,
    cc: row.cc,
    bcc: row.bcc,
    reply_to: row.replyTo,
    subject: row.subject,
    html: row.html,
    text: row.text,
    headers: row.headers,
    tags: row.tags,
    status: row.status,
    sandbox: opts.sandbox,
    created_at: row.createdAt.toISOString(),
    sent_at: row.sentAt?.toISOString() ?? null,
  };
}

/** Email rows joined with their environment's mode, scoped by organization. */
export async function selectEmailsWithMode(
  organizationId: string,
  where: SQL | undefined,
  limit: number,
): Promise<{ email: EmailRow; sandbox: boolean }[]> {
  const rows = await db
    .select({ email, mode: environment.mode })
    .from(email)
    .innerJoin(
      environment,
      and(
        eq(environment.id, email.environmentId),
        eq(environment.organizationId, email.organizationId),
      ),
    )
    .where(and(eq(email.organizationId, organizationId), where))
    // Matches the (environment_id, created_at DESC NULLS LAST) index; ids break ties in time order.
    .orderBy(sql`${email.createdAt} desc nulls last`, desc(email.id))
    .limit(limit);
  return rows.map((row) => ({ email: row.email, sandbox: row.mode === "sandbox" }));
}

/** One email of an environment. Malformed, unknown and foreign ids are all `null`. */
export async function getEmail(input: {
  organizationId: string;
  environmentId: string;
  id: string;
}): Promise<EmailObjectOutput | null> {
  if (!isId("email", input.id)) return null;
  const [row] = await selectEmailsWithMode(
    input.organizationId,
    and(eq(email.environmentId, input.environmentId), eq(email.id, input.id)),
    1,
  );
  return row ? toEmailObject(row.email, { sandbox: row.sandbox }) : null;
}

/** Newest first; `limit` defaults to 50 and is capped at 100. */
export async function listEmails(input: {
  organizationId: string;
  environmentId: string;
  limit?: number;
}): Promise<EmailObjectOutput[]> {
  const requested = Math.trunc(input.limit ?? DEFAULT_LIST_LIMIT);
  const limit = Number.isFinite(requested)
    ? Math.min(Math.max(requested, 1), MAX_LIST_LIMIT)
    : DEFAULT_LIST_LIMIT;
  const rows = await selectEmailsWithMode(
    input.organizationId,
    eq(email.environmentId, input.environmentId),
    limit,
  );
  return rows.map((row) => toEmailObject(row.email, { sandbox: row.sandbox }));
}
