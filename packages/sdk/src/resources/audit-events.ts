import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type { AuditEvent, ListAuditEventsParams } from "../types/audit-event.ts";
import type { List } from "../types/email.ts";
import { listQuery } from "./list-query.ts";

type ReadOptions = Pick<RequestOptions, "signal">;

/**
 * `coss.auditEvents`: the organization's audit log, newest first: changes made by members, API
 * keys and COSS support. Organization-wide, whichever environment the key belongs to.
 */
export class AuditEventsResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().auditEvents`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** Lists audit events, newest first. Pass the last `id` as `after` while `has_more` is true. */
  list(
    params: ListAuditEventsParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<List<AuditEvent>>> {
    return this.#http.request<List<AuditEvent>>({
      method: "GET",
      path: "/v1/audit_events",
      query: listQuery(params),
      signal: options?.signal,
    });
  }

  /** Retrieves one audit event. */
  get(id: string, options?: ReadOptions): Promise<CossResult<AuditEvent>> {
    return this.#http.request<AuditEvent>({
      method: "GET",
      path: `/v1/audit_events/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
  }
}
