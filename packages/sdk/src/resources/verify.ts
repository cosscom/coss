import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type { List } from "../types/email.ts";
import type {
  CheckVerificationParams,
  ListVerificationsParams,
  StartVerificationParams,
  Verification,
  VerificationCheck,
} from "../types/verify.ts";
import { listQuery } from "./list-query.ts";

type ReadOptions = Pick<RequestOptions, "signal">;

/**
 * `coss.verify`: one-time codes by SMS or email. `start` sends a code, `check` compares the one the
 * end user typed. A fraud guard stops abuse (SMS pumping) before anything is sent; sandbox
 * (`coss_test_…`) keys deliver nothing and the code is always zeros.
 */
export class VerifyResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().verify`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /**
   * Sends a code to a phone number (E.164, by SMS) or an email address. Starting again for the
   * same destination while it is pending sends a new code. Pass the end user's `ip`.
   */
  start(
    params: StartVerificationParams,
    options?: RequestOptions,
  ): Promise<CossResult<Verification>> {
    return this.#http.request<Verification>({
      method: "POST",
      path: "/v1/verifications",
      body: params,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  /**
   * Checks the code the end user typed, by `verification_id` or by `to`. Only `valid: true`
   * proves they have the phone or mailbox.
   */
  check(
    params: CheckVerificationParams,
    options?: RequestOptions,
  ): Promise<CossResult<VerificationCheck>> {
    return this.#http.request<VerificationCheck>({
      method: "POST",
      path: "/v1/verifications/check",
      body: params,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  /** Retrieves one verification. */
  get(id: string, options?: ReadOptions): Promise<CossResult<Verification>> {
    return this.#http.request<Verification>({
      method: "GET",
      path: `/v1/verifications/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
  }

  /** Lists verifications, newest first. Pass the last `id` as `after` while `has_more` is true. */
  list(
    params: ListVerificationsParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<List<Verification>>> {
    return this.#http.request<List<Verification>>({
      method: "GET",
      path: "/v1/verifications",
      query: listQuery(params),
      signal: options?.signal,
    });
  }

  /** Cancels a pending verification: its code stops working. */
  cancel(id: string, options?: RequestOptions): Promise<CossResult<Verification>> {
    return this.#http.request<Verification>({
      method: "POST",
      path: `/v1/verifications/${encodeURIComponent(id)}/cancel`,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }
}
