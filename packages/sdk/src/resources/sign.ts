import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type { List } from "../types/email.ts";
import type {
  CreateSignRequestParams,
  DeletedSignDocument,
  ListSignDocumentsParams,
  ListSignRequestsParams,
  SignDocument,
  SignEvent,
  SignRequest,
  UploadSignDocumentParams,
} from "../types/sign.ts";
import { listQuery } from "./list-query.ts";

type ReadOptions = Pick<RequestOptions, "signal">;

/** `coss.sign.documents`: PDFs uploaded for signature requests to use. */
export class SignDocumentsResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().sign.documents`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /**
   * Uploads a PDF (at most 25 MB and 500 pages, not password-protected). The result lists each
   * page's size and the text anchors found in it. Not retried automatically: a retry would upload
   * a second copy.
   */
  upload(
    params: UploadSignDocumentParams,
    options?: ReadOptions,
  ): Promise<CossResult<SignDocument>> {
    return this.#http.request<SignDocument>({
      method: "POST",
      path: "/v1/sign/documents",
      body: params,
      retry: false,
      signal: options?.signal,
    });
  }

  /** Lists documents, newest first. Pass the last `id` as `after` while `has_more` is true. */
  list(
    params: ListSignDocumentsParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<List<SignDocument>>> {
    return this.#http.request<List<SignDocument>>({
      method: "GET",
      path: "/v1/sign/documents",
      query: listQuery(params),
      signal: options?.signal,
    });
  }

  /** Retrieves one document. */
  get(id: string, options?: ReadOptions): Promise<CossResult<SignDocument>> {
    return this.#http.request<SignDocument>({
      method: "GET",
      path: `/v1/sign/documents/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
  }

  /** Deletes a document no signature request uses (`document_in_use` otherwise). */
  remove(id: string, options?: ReadOptions): Promise<CossResult<DeletedSignDocument>> {
    return this.#http.request<DeletedSignDocument>({
      method: "DELETE",
      path: `/v1/sign/documents/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
  }
}

/** `coss.sign.requests`: requests for people to sign documents. */
export class SignRequestsResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().sign.requests`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /**
   * Asks signers to sign documents (uploaded, or inline), each signer's fields placed by position
   * or text anchor. Sent at once unless `send` is `false`. Safe to retry: every request carries
   * an `Idempotency-Key`.
   */
  create(
    params: CreateSignRequestParams,
    options?: RequestOptions,
  ): Promise<CossResult<SignRequest>> {
    return this.#http.request<SignRequest>({
      method: "POST",
      path: "/v1/sign/requests",
      body: params,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  /** Retrieves one request with its signers and fields. */
  get(id: string, options?: ReadOptions): Promise<CossResult<SignRequest>> {
    return this.#http.request<SignRequest>({
      method: "GET",
      path: `/v1/sign/requests/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
  }

  /** Lists requests, newest first. Pass the last `id` as `after` while `has_more` is true. */
  list(
    params: ListSignRequestsParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<List<SignRequest>>> {
    return this.#http.request<List<SignRequest>>({
      method: "GET",
      path: "/v1/sign/requests",
      query: listQuery(params),
      signal: options?.signal,
    });
  }

  /** Sends a draft. An already sent request is returned as is. */
  send(id: string, options?: ReadOptions): Promise<CossResult<SignRequest>> {
    return this.#http.request<SignRequest>({
      method: "POST",
      path: `/v1/sign/requests/${encodeURIComponent(id)}/send`,
      signal: options?.signal,
    });
  }

  /** Cancels a draft or sent request; signers can no longer sign it. */
  cancel(id: string, options?: ReadOptions): Promise<CossResult<SignRequest>> {
    return this.#http.request<SignRequest>({
      method: "POST",
      path: `/v1/sign/requests/${encodeURIComponent(id)}/cancel`,
      signal: options?.signal,
    });
  }

  /** The request's audit trail, oldest first, hash-chained. */
  auditTrail(id: string, options?: ReadOptions): Promise<CossResult<List<SignEvent>>> {
    return this.#http.request<List<SignEvent>>({
      method: "GET",
      path: `/v1/sign/requests/${encodeURIComponent(id)}/audit_trail`,
      signal: options?.signal,
    });
  }
}

/** `coss.sign`: e-signatures: documents and signature requests. */
export class SignResource {
  readonly documents: SignDocumentsResource;
  readonly requests: SignRequestsResource;

  /** @internal Use `new Coss().sign`. */
  constructor(http: HttpClient) {
    this.documents = new SignDocumentsResource(http);
    this.requests = new SignRequestsResource(http);
  }
}
