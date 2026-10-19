import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type { List } from "../types/email.ts";
import type {
  DeletedSmsSuppression,
  ListReceivedSmsParams,
  ListSmsParams,
  ListSmsSuppressionsParams,
  ReceivedSms,
  SendSmsParams,
  Sms,
  SmsEvent,
  SmsNumber,
  SmsSuppression,
  SmsSuppressionCheck,
} from "../types/sms.ts";
import { listQuery } from "./list-query.ts";

type ReadOptions = Pick<RequestOptions, "signal">;

/**
 * `coss.sms.suppressions`: numbers sends from the API key's environment skip. Opt-outs (STOP) and
 * numbers that can't receive SMS are added automatically.
 */
export class SmsSuppressionsResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().sms.suppressions`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** Adds a number (E.164). Returns the existing entry if there already is one. */
  add(
    params: { phone_number: string },
    options?: RequestOptions,
  ): Promise<CossResult<SmsSuppression>> {
    return this.#http.request<SmsSuppression>({
      method: "POST",
      path: "/v1/sms/suppressions",
      body: params,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  /** Lists entries, newest first. Pass the last `id` as `after` while `has_more` is true. */
  list(
    params: ListSmsSuppressionsParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<List<SmsSuppression>>> {
    return this.#http.request<List<SmsSuppression>>({
      method: "GET",
      path: "/v1/sms/suppressions",
      query: listQuery(params),
      signal: options?.signal,
    });
  }

  /** Whether a send to `phone_number` would be skipped. */
  check(
    params: { phone_number: string },
    options?: ReadOptions,
  ): Promise<CossResult<SmsSuppressionCheck>> {
    return this.#http.request<SmsSuppressionCheck>({
      method: "GET",
      path: "/v1/sms/suppressions/check",
      query: { ...params },
      signal: options?.signal,
    });
  }

  /** Retrieves one entry. */
  get(id: string, options?: ReadOptions): Promise<CossResult<SmsSuppression>> {
    return this.#http.request<SmsSuppression>({
      method: "GET",
      path: `/v1/sms/suppressions/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
  }

  /** Removes an entry. Remove an opt-out only when the person asked for messages again. */
  remove(id: string, options?: ReadOptions): Promise<CossResult<DeletedSmsSuppression>> {
    return this.#http.request<DeletedSmsSuppression>({
      method: "DELETE",
      path: `/v1/sms/suppressions/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
  }
}

/** `coss.sms.received`: messages sent to the organization's numbers, in this key's environment. */
export class ReceivedSmsResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().sms.received`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** Lists received messages, newest first. */
  list(
    params: ListReceivedSmsParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<List<ReceivedSms>>> {
    return this.#http.request<List<ReceivedSms>>({
      method: "GET",
      path: "/v1/sms/received",
      query: listQuery(params),
      signal: options?.signal,
    });
  }

  /** Retrieves one received message. */
  get(id: string, options?: ReadOptions): Promise<CossResult<ReceivedSms>> {
    return this.#http.request<ReceivedSms>({
      method: "GET",
      path: `/v1/sms/received/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
  }
}

/** `coss.sms.numbers`: the organization's phone numbers (bought and registered in the dashboard). */
export class SmsNumbersResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().sms.numbers`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** Every number, whether it can send live messages now and whether replies arrive here. */
  list(options?: ReadOptions): Promise<CossResult<List<SmsNumber>>> {
    return this.#http.request<List<SmsNumber>>({
      method: "GET",
      path: "/v1/sms/numbers",
      signal: options?.signal,
    });
  }
}

/**
 * `coss.sms`: text messages from the organization's numbers. Sandbox keys simulate every send (see
 * the SMS simulator's numbers in the docs).
 */
export class SmsResource {
  readonly #http: HttpClient;
  readonly suppressions: SmsSuppressionsResource;
  readonly received: ReceivedSmsResource;
  readonly numbers: SmsNumbersResource;

  /** @internal Use `new Coss().sms`. */
  constructor(http: HttpClient) {
    this.#http = http;
    this.suppressions = new SmsSuppressionsResource(http);
    this.received = new ReceivedSmsResource(http);
    this.numbers = new SmsNumbersResource(http);
  }

  /**
   * Queues a message. Live keys send `from` one of the organization's approved numbers to the
   * countries it allows; each segment (160 GSM-7 or 70 Unicode characters, 153/67 when split) is
   * billed by destination. Safe to retry: every request carries an `Idempotency-Key`.
   */
  send(params: SendSmsParams, options?: RequestOptions): Promise<CossResult<Sms>> {
    return this.#http.request<Sms>({
      method: "POST",
      path: "/v1/sms",
      body: params,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  /** Retrieves one message with its current status. */
  get(id: string, options?: ReadOptions): Promise<CossResult<Sms>> {
    return this.#http.request<Sms>({
      method: "GET",
      path: `/v1/sms/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
  }

  /** Lists messages sent from the API key's environment, newest first. */
  list(params: ListSmsParams = {}, options?: ReadOptions): Promise<CossResult<List<Sms>>> {
    return this.#http.request<List<Sms>>({
      method: "GET",
      path: "/v1/sms",
      query: listQuery(params),
      signal: options?.signal,
    });
  }

  /** Everything that happened to a message, oldest first. */
  listEvents(id: string, options?: ReadOptions): Promise<CossResult<List<SmsEvent>>> {
    return this.#http.request<List<SmsEvent>>({
      method: "GET",
      path: `/v1/sms/${encodeURIComponent(id)}/events`,
      signal: options?.signal,
    });
  }

  /** Cancels a scheduled message; any other fails with `sms_not_cancelable`. */
  cancel(id: string, options?: ReadOptions): Promise<CossResult<Sms>> {
    return this.#http.request<Sms>({
      method: "POST",
      path: `/v1/sms/${encodeURIComponent(id)}/cancel`,
      signal: options?.signal,
    });
  }
}
