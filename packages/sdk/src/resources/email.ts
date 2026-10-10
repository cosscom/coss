import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type { Email, EmailEvent, List, SendEmailParams } from "../types/email.ts";
import { SuppressionResource } from "./suppressions.ts";

/** `coss.email`: transactional email. */
export class EmailResource {
  readonly #http: HttpClient;
  /** The environment's suppression list. */
  readonly suppressions: SuppressionResource;

  /** @internal Use `new Coss().email`. */
  constructor(http: HttpClient) {
    this.#http = http;
    this.suppressions = new SuppressionResource(http);
  }

  /**
   * Sends an email. Safe to retry: the request always carries an `Idempotency-Key` (yours, or a
   * generated one reused across automatic retries), so the API never sends it twice.
   */
  send(params: SendEmailParams, options?: RequestOptions): Promise<CossResult<Email>> {
    return this.#http.request<Email>({
      method: "POST",
      path: "/v1/emails",
      body: params,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  /** Retrieves an email sent from the same environment as the API key. */
  get(id: string, options?: Pick<RequestOptions, "signal">): Promise<CossResult<Email>> {
    return this.#http.request<Email>({
      method: "GET",
      path: `/v1/emails/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
  }

  /**
   * Cancels a scheduled email. Canceling an already canceled email returns it; any other email
   * fails with `email_not_cancelable`.
   */
  cancel(id: string, options?: Pick<RequestOptions, "signal">): Promise<CossResult<Email>> {
    return this.#http.request<Email>({
      method: "POST",
      path: `/v1/emails/${encodeURIComponent(id)}/cancel`,
      signal: options?.signal,
    });
  }

  /** Lists an email's delivery events, oldest first. */
  listEvents(
    id: string,
    options?: Pick<RequestOptions, "signal">,
  ): Promise<CossResult<List<EmailEvent>>> {
    return this.#http.request<List<EmailEvent>>({
      method: "GET",
      path: `/v1/emails/${encodeURIComponent(id)}/events`,
      signal: options?.signal,
    });
  }
}
