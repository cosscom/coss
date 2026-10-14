import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type { List } from "../types/email.ts";
import type {
  AssessRiskParams,
  CreateRiskListEntryParams,
  DeletedRiskListEntry,
  ForgottenRiskUser,
  ListRiskAssessmentsParams,
  ListRiskListEntriesParams,
  RiskAssessment,
  RiskFeedbackParams,
  RiskList,
  RiskListEntry,
  RiskListEntryType,
  RiskListEntryValue,
} from "../types/risk.ts";

type ReadOptions = Pick<RequestOptions, "signal">;

const LIST_ENTRY_TYPES: readonly RiskListEntryType[] = [
  "email",
  "domain",
  "ip",
  "asn",
  "country",
  "user",
];

/** `coss.risk.assessments`: reading past assessments (`assess` lives on `coss.risk`). */
export class RiskAssessmentsResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().risk.assessments`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** Retrieves one assessment. */
  get(id: string, options?: ReadOptions): Promise<CossResult<RiskAssessment>> {
    return this.#http.request<RiskAssessment>({
      method: "GET",
      path: `/v1/risk/assessments/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
  }

  /**
   * Lists assessments, newest first (`review_status: "open"` is the review queue). Pass the last
   * `id` as `after` while `has_more` is true.
   */
  list(
    params: ListRiskAssessmentsParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<List<RiskAssessment>>> {
    return this.#http.request<List<RiskAssessment>>({
      method: "GET",
      path: "/v1/risk/assessments",
      query: { ...params },
      signal: options?.signal,
    });
  }
}

/** `coss.risk.lists`: the environment's allow and block lists. */
export class RiskListsResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().risk.lists`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /**
   * Adds an entry: `coss.risk.lists.add("block", { domain: "evil.example" })`. An allow-list match
   * makes decisions `allow`, a block-list match `block`. Returns the existing entry if there is one.
   */
  add(
    list: RiskList,
    entry: RiskListEntryValue & { note?: string; expires_at?: string | Date },
    options?: RequestOptions,
  ): Promise<CossResult<RiskListEntry>> {
    const type = LIST_ENTRY_TYPES.find((name) => name in entry) as RiskListEntryType;
    const body: CreateRiskListEntryParams = {
      list,
      type,
      value: String((entry as Record<string, unknown>)[type] ?? ""),
      ...(entry.note === undefined ? {} : { note: entry.note }),
      ...(entry.expires_at === undefined
        ? {}
        : {
            expires_at:
              entry.expires_at instanceof Date ? entry.expires_at.toISOString() : entry.expires_at,
          }),
    };
    return this.#http.request<RiskListEntry>({
      method: "POST",
      path: "/v1/risk/list_entries",
      body,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  /** Lists entries, newest first. Pass the last `id` as `after` while `has_more` is true. */
  list(
    params: ListRiskListEntriesParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<List<RiskListEntry>>> {
    return this.#http.request<List<RiskListEntry>>({
      method: "GET",
      path: "/v1/risk/list_entries",
      query: { ...params },
      signal: options?.signal,
    });
  }

  /** Retrieves one entry. */
  get(id: string, options?: ReadOptions): Promise<CossResult<RiskListEntry>> {
    return this.#http.request<RiskListEntry>({
      method: "GET",
      path: `/v1/risk/list_entries/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
  }

  /** Removes an entry. */
  remove(id: string, options?: ReadOptions): Promise<CossResult<DeletedRiskListEntry>> {
    return this.#http.request<DeletedRiskListEntry>({
      method: "DELETE",
      path: `/v1/risk/list_entries/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
  }
}

/** `coss.risk.users`: what COSS remembers about your users. */
export class RiskUsersResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().risk.users`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /**
   * Call when you delete a user: COSS deletes what identifies them (their mailbox, fraud reports,
   * and the user id, email, IP and user agent on their assessments). Safe to repeat.
   */
  forget(userId: string, options?: ReadOptions): Promise<CossResult<ForgottenRiskUser>> {
    return this.#http.request<ForgottenRiskUser>({
      method: "DELETE",
      path: `/v1/risk/users/${encodeURIComponent(userId)}`,
      signal: options?.signal,
    });
  }
}

/**
 * `coss.risk`: assess sign-ups, logins and other events. Call it from your server and treat an
 * error as `allow` (fail open), so an outage never locks your users out.
 *
 * ```ts
 * const { data } = await coss.risk.assess({ event: "signup", user: { email }, ip, user_agent });
 * if (data?.decision === "block") return refuse();
 * ```
 */
export class RiskResource {
  /** Past assessments (`get`, `list`). */
  readonly assessments: RiskAssessmentsResource;
  /** Allow and block lists (`add`, `list`, `get`, `remove`). */
  readonly lists: RiskListsResource;
  /** Forgetting deleted users. */
  readonly users: RiskUsersResource;
  readonly #http: HttpClient;

  /** @internal Use `new Coss().risk`. */
  constructor(http: HttpClient) {
    this.#http = http;
    this.assessments = new RiskAssessmentsResource(http);
    this.lists = new RiskListsResource(http);
    this.users = new RiskUsersResource(http);
  }

  /**
   * Assesses an event and returns the decision with its score and reasons. Retries reuse one
   * `Idempotency-Key`, so an event is never counted twice.
   */
  assess(params: AssessRiskParams, options?: RequestOptions): Promise<CossResult<RiskAssessment>> {
    return this.#http.request<RiskAssessment>({
      method: "POST",
      path: "/v1/risk/assessments",
      body: params,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  /**
   * Reports what an assessed user turned out to be: `fraud` and `abuse` teach later assessments to
   * flag the same mailbox, user, IP and subnet; `legitimate` takes that back. Resolves a review.
   */
  feedback(
    id: string,
    params: RiskFeedbackParams,
    options?: RequestOptions,
  ): Promise<CossResult<RiskAssessment>> {
    return this.#http.request<RiskAssessment>({
      method: "POST",
      path: `/v1/risk/assessments/${encodeURIComponent(id)}/feedback`,
      body: params,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }
}
