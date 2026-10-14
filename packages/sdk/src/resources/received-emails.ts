import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type { List } from "../types/email.ts";
import type {
  DeletedReceivedEmail,
  InboundAddress,
  ListReceivedEmailsParams,
  ReceivedEmail,
  ReceivedEmailSummary,
} from "../types/received-email.ts";
import { listQuery } from "./list-query.ts";

type ReadOptions = Pick<RequestOptions, "signal">;

const emailPath = (id: string) => `/v1/received_emails/${encodeURIComponent(id)}`;

/**
 * `coss.email.received`: emails received by the API key's environment, at its inbound address
 * (`address()`) or at a receiving domain (`coss.domains.receiving`). An `email.received` webhook
 * announces each one.
 */
export class ReceivedEmailsResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().email.received`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** Lists received emails, newest first, without bodies. Pass the last `id` as `after` while `has_more` is true. */
  list(
    params: ListReceivedEmailsParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<List<ReceivedEmailSummary>>> {
    return this.#http.request<List<ReceivedEmailSummary>>({
      method: "GET",
      path: "/v1/received_emails",
      query: listQuery(params),
      signal: options?.signal,
    });
  }

  /** Retrieves a received email with its headers and bodies. */
  get(id: string, options?: ReadOptions): Promise<CossResult<ReceivedEmail>> {
    return this.#http.request<ReceivedEmail>({
      method: "GET",
      path: emailPath(id),
      signal: options?.signal,
    });
  }

  /** The whole message as received (`message/rfc822` bytes). */
  getRaw(id: string, options?: ReadOptions): Promise<CossResult<Uint8Array>> {
    return this.#http.request<Uint8Array>({
      method: "GET",
      path: `${emailPath(id)}/raw`,
      responseType: "bytes",
      signal: options?.signal,
    });
  }

  /** An attachment's bytes (untrusted: its declared type is the attachment's `content_type`). */
  getAttachment(
    id: string,
    attachmentId: string,
    options?: ReadOptions,
  ): Promise<CossResult<Uint8Array>> {
    return this.#http.request<Uint8Array>({
      method: "GET",
      path: `${emailPath(id)}/attachments/${encodeURIComponent(attachmentId)}`,
      responseType: "bytes",
      signal: options?.signal,
    });
  }

  /**
   * The environment's inbound domain: email to any address at it (`support@<domain>`) is
   * received, with no DNS setup.
   */
  address(options?: ReadOptions): Promise<CossResult<InboundAddress>> {
    return this.#http.request<InboundAddress>({
      method: "GET",
      path: "/v1/received_emails/address",
      signal: options?.signal,
    });
  }

  /** Deletes a received email with its raw message and attachments right away. */
  delete(id: string, options?: ReadOptions): Promise<CossResult<DeletedReceivedEmail>> {
    return this.#http.request<DeletedReceivedEmail>({
      method: "DELETE",
      path: emailPath(id),
      signal: options?.signal,
    });
  }
}
