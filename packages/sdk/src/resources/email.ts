import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import { renderReactEmail, type SendEmailBody } from "../react.ts";
import type {
  Email,
  EmailBatch,
  EmailEvent,
  EmailLink,
  EmailSummary,
  List,
  ListEmailsParams,
  RescheduleEmailParams,
  SendEmailParams,
} from "../types/email.ts";
import { listQuery } from "./list-query.ts";
import { ReceivedEmailsResource } from "./received-emails.ts";
import { SuppressionResource } from "./suppressions.ts";
import { TrackingResource } from "./tracking.ts";

/** `coss.email`: transactional email. */
export class EmailResource {
  readonly #http: HttpClient;
  /** The environment's suppression list. */
  readonly suppressions: SuppressionResource;
  /** The environment's open and click tracking settings. */
  readonly tracking: TrackingResource;
  /** Emails the environment received. */
  readonly received: ReceivedEmailsResource;

  /** @internal Use `new Coss().email`. */
  constructor(http: HttpClient) {
    this.#http = http;
    this.suppressions = new SuppressionResource(http);
    this.tracking = new TrackingResource(http);
    this.received = new ReceivedEmailsResource(http);
  }

  /**
   * Sends an email. It is returned `queued` and handed to the delivery provider moments later:
   * `get` it or listen for the `email.sent` / `email.failed` webhooks for the outcome. Safe to
   * retry: the request always carries an `Idempotency-Key` (yours, or a generated one reused
   * across automatic retries), so the API never sends it twice. A `react` component is rendered
   * once, before the first attempt.
   */
  async send(params: SendEmailParams, options?: RequestOptions): Promise<CossResult<Email>> {
    const { body, error } = await renderReactEmail(params, "react");
    if (error) return { data: null, error };
    return this.#http.request<Email>({
      method: "POST",
      path: "/v1/emails",
      body,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  /**
   * Sends up to 100 emails in one request, each as `send` would. The batch is all or nothing: if
   * any email is invalid (the error's `issues` name it, e.g. `emails.3.to`), none is sent. Its
   * recipients count against the send quota together. Safe to retry: one `Idempotency-Key` covers
   * the whole batch. Larger lists need several calls, each with its own key.
   */
  async sendBatch(
    emails: SendEmailParams[],
    options?: RequestOptions,
  ): Promise<CossResult<EmailBatch>> {
    const rendered = await Promise.all(
      emails.map((email, index) => renderReactEmail(email, `emails.${index}.react`)),
    );
    const bodies: SendEmailBody[] = [];
    for (const { body, error } of rendered) {
      if (error) return { data: null, error };
      bodies.push(body);
    }
    return this.#http.request<EmailBatch>({
      method: "POST",
      path: "/v1/emails/batch",
      body: { emails: bodies },
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  /** Retrieves a batch sent by `sendBatch`, with its emails' current statuses in request order. */
  getBatch(id: string, options?: Pick<RequestOptions, "signal">): Promise<CossResult<EmailBatch>> {
    return this.#http.request<EmailBatch>({
      method: "GET",
      path: `/v1/emails/batch/${encodeURIComponent(id)}`,
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
   * Lists emails sent from the same environment as the API key, newest first and without their
   * content (`get` one for `html`, `text`, `headers` and `attachments`). Pass the last `id` as
   * `after` while `has_more` is true.
   */
  list(
    params: ListEmailsParams = {},
    options?: Pick<RequestOptions, "signal">,
  ): Promise<CossResult<List<EmailSummary>>> {
    return this.#http.request<List<EmailSummary>>({
      method: "GET",
      path: "/v1/emails",
      query: listQuery(params),
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

  /**
   * Moves a scheduled email to a new time and records an `email.rescheduled` event. The time it
   * already has returns it unchanged; an email that is no longer scheduled fails with
   * `email_not_reschedulable`.
   */
  reschedule(
    id: string,
    params: RescheduleEmailParams,
    options?: Pick<RequestOptions, "signal">,
  ): Promise<CossResult<Email>> {
    return this.#http.request<Email>({
      method: "POST",
      path: `/v1/emails/${encodeURIComponent(id)}/reschedule`,
      body: params,
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

  /** Lists the links tracked for clicks in an email, in document order, with click counts. */
  listLinks(
    id: string,
    options?: Pick<RequestOptions, "signal">,
  ): Promise<CossResult<List<EmailLink>>> {
    return this.#http.request<List<EmailLink>>({
      method: "GET",
      path: `/v1/emails/${encodeURIComponent(id)}/links`,
      signal: options?.signal,
    });
  }
}
