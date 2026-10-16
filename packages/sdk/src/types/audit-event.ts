/** Audit log wire types (hand-written mirrors of the API's schemas). */

/**
 * `user`: a member, in the dashboard. `api_key`: a request made with an API key. `system`: coss.com
 * itself, including coss.com support.
 */
export type AuditActorType = "user" | "api_key" | "system";

/** One change to the organization. */
export interface AuditEvent {
  object: "audit_event";
  id: string;
  /** ISO 8601 timestamp. */
  created_at: string;
  actor_type: AuditActorType;
  /** The user's or API key's id; `null` for the system. */
  actor_id: string | null;
  /** The user's email, the API key's id, or `coss.com support` (copied when recorded). */
  actor_label: string;
  /** `<resource>.<verb>`, e.g. `api_key.created`, `domain.deleted`, `member.role_changed`. */
  action: string;
  /** What was changed: `domain`, `api_key`, `member`… */
  target_type: string | null;
  target_id: string | null;
  /** A readable name for the target when it was changed. */
  target_label: string | null;
  /** `null` for organization-wide changes (domains, members…). */
  project_id: string | null;
  /** `null` for organization-wide changes (domains, members…). */
  environment_id: string | null;
  /** Details of the change; API changes include their `request_id`. */
  metadata: Record<string, unknown>;
  client_ip: string | null;
  user_agent: string | null;
}

type OneOrMany<T> = T | readonly T[];

/** Query of `GET /v1/audit_events`. Lists may be given as arrays or comma-separated strings. */
export interface ListAuditEventsParams {
  /** Actions, e.g. `"api_key.created"`; an entry ending in `.` (`"domain."`) matches a whole resource. */
  action?: OneOrMany<string>;
  actor_type?: OneOrMany<AuditActorType>;
  /** Only changes made by this user or API key. */
  actor_id?: string;
  /** Only changes to this resource, e.g. a `dom_…` id. */
  target_id?: string;
  /** Only changes in this environment. */
  environment_id?: string;
  /** Only events at or after this time. */
  from?: string | Date;
  /** Only events before this time. */
  to?: string | Date;
  /** 1-100, default 50. */
  limit?: number;
  /** The `id` of the last event of the previous page. */
  after?: string;
}
