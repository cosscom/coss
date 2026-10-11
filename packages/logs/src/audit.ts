import { db, type Executor, schema } from "@coss/db";
import { ID_PREFIXES, isId, newId } from "@coss/db/id";
import { and, desc, eq, gte, inArray, like, lt, or } from "drizzle-orm";
import { activeLogDrains, insertLogDrainRecords } from "./drain-outbox.ts";
import type { OrgAuditActorType, OrgAuditEventOutput } from "./schemas.ts";

const { orgAuditEvent } = schema;

export type OrgAuditEventRow = typeof orgAuditEvent.$inferSelect;

export type OrgAuditActor = {
  type: OrgAuditActorType;
  /** User id or API key id; `null` for the system. */
  id: string | null;
  /** The user's email or the key's name, copied so it outlives them. */
  label: string;
};

export type OrgAuditEventInput = {
  organizationId: string;
  actor: OrgAuditActor;
  /** `<resource>.<verb>`, e.g. `api_key.created`. */
  action: string;
  target?: { type: string; id: string | null; label?: string | null };
  projectId?: string | null;
  environmentId?: string | null;
  metadata?: Record<string, unknown>;
  clientIp?: string | null;
  userAgent?: string | null;
};

/**
 * Records one change to an organization. Pass the transaction that makes the change when there is
 * one, so the entry exists exactly when the change does.
 */
export async function recordOrgAuditEvent(
  input: OrgAuditEventInput,
  executor: Executor = db,
): Promise<void> {
  const values = {
    id: newId(ID_PREFIXES.orgAuditEvent),
    organizationId: input.organizationId,
    projectId: input.projectId ?? null,
    environmentId: input.environmentId ?? null,
    actorType: input.actor.type,
    actorId: input.actor.id,
    actorLabel: input.actor.label.slice(0, 320),
    action: input.action,
    targetType: input.target?.type ?? null,
    targetId: input.target?.id ?? null,
    targetLabel: input.target?.label?.slice(0, 320) ?? null,
    metadata: input.metadata ?? {},
    clientIp: input.clientIp?.slice(0, 64) ?? null,
    userAgent: input.userAgent?.slice(0, 512) ?? null,
    createdAt: new Date(),
  } satisfies OrgAuditEventRow;
  // Only environment-scoped events reach log drains (drains belong to an environment).
  if (!values.environmentId) {
    await executor.insert(orgAuditEvent).values(values);
    return;
  }
  const environmentId = values.environmentId;
  await executor.transaction(async (tx) => {
    const drains = await activeLogDrains(tx, [environmentId]);
    await tx.insert(orgAuditEvent).values(values);
    await insertLogDrainRecords(tx, drains, [
      {
        organizationId: values.organizationId,
        environmentId,
        source: "audit",
        sourceId: values.id,
        // The audit event exactly as `GET /v1/audit_events` returns it.
        line: toOrgAuditObject(values),
      },
    ]);
  });
}

export function toOrgAuditObject(row: OrgAuditEventRow): OrgAuditEventOutput {
  return {
    object: "audit_event",
    id: row.id,
    created_at: row.createdAt.toISOString(),
    actor_type: row.actorType,
    actor_id: row.actorId,
    actor_label: row.actorLabel,
    action: row.action,
    target_type: row.targetType,
    target_id: row.targetId,
    target_label: row.targetLabel,
    project_id: row.projectId,
    environment_id: row.environmentId,
    metadata: row.metadata,
    client_ip: row.clientIp,
    user_agent: row.userAgent,
  };
}

export type OrgAuditFilters = {
  /** Exact actions, or prefixes ending in `.` (`domain.`). */
  actions?: string[];
  actorTypes?: OrgAuditActorType[];
  actorId?: string;
  targetId?: string;
  environmentId?: string;
  from?: Date;
  to?: Date;
};

export const DEFAULT_ORG_AUDIT_LIMIT = 50;

/** `LIKE` pattern for values starting with `prefix` (its `%`, `_` and `\` matched literally). */
function startsWith(prefix: string): string {
  return `${prefix.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

/** Newest first, paginated by `before` (the last id of the previous page). */
export async function listOrgAuditEvents(input: {
  organizationId: string;
  filters?: OrgAuditFilters;
  before?: string;
  limit?: number;
}): Promise<{ events: OrgAuditEventOutput[]; nextBefore: string | null }> {
  const limit = Math.min(input.limit ?? DEFAULT_ORG_AUDIT_LIMIT, 1000);
  if (input.before !== undefined && !isId("oaudit", input.before)) {
    return { events: [], nextBefore: null };
  }
  const filters = input.filters ?? {};
  const exact = filters.actions?.filter((action) => !action.endsWith(".")) ?? [];
  const prefixes = filters.actions?.filter((action) => action.endsWith(".")) ?? [];
  const rows = await db
    .select()
    .from(orgAuditEvent)
    .where(
      and(
        eq(orgAuditEvent.organizationId, input.organizationId),
        exact.length > 0 || prefixes.length > 0
          ? or(
              exact.length > 0 ? inArray(orgAuditEvent.action, exact) : undefined,
              ...prefixes.map((prefix) => like(orgAuditEvent.action, startsWith(prefix))),
            )
          : undefined,
        filters.actorTypes && filters.actorTypes.length > 0
          ? inArray(orgAuditEvent.actorType, filters.actorTypes)
          : undefined,
        filters.actorId ? eq(orgAuditEvent.actorId, filters.actorId) : undefined,
        filters.targetId ? eq(orgAuditEvent.targetId, filters.targetId) : undefined,
        filters.environmentId ? eq(orgAuditEvent.environmentId, filters.environmentId) : undefined,
        filters.from ? gte(orgAuditEvent.createdAt, filters.from) : undefined,
        filters.to ? lt(orgAuditEvent.createdAt, filters.to) : undefined,
        input.before ? lt(orgAuditEvent.id, input.before) : undefined,
      ),
    )
    .orderBy(desc(orgAuditEvent.id))
    .limit(limit + 1);
  const events = rows.slice(0, limit).map(toOrgAuditObject);
  return { events, nextBefore: rows.length > limit ? (events.at(-1)?.id ?? null) : null };
}

/** One event of the organization's audit log, or `null`. */
export async function getOrgAuditEvent(
  organizationId: string,
  id: string,
): Promise<OrgAuditEventOutput | null> {
  if (!isId("oaudit", id)) return null;
  const [row] = await db
    .select()
    .from(orgAuditEvent)
    .where(and(eq(orgAuditEvent.organizationId, organizationId), eq(orgAuditEvent.id, id)))
    .limit(1);
  return row ? toOrgAuditObject(row) : null;
}

/** Distinct actions an organization has recorded (the dashboard's action filter). */
export async function listOrgAuditActions(organizationId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ action: orgAuditEvent.action })
    .from(orgAuditEvent)
    .where(eq(orgAuditEvent.organizationId, organizationId))
    .orderBy(orgAuditEvent.action)
    .limit(200);
  return rows.map((row) => row.action);
}
