import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type { List } from "../types/email.ts";
import type {
  CreateSignRequestParams,
  CreateSignSessionParams,
  DeletedSignDocument,
  ListSignDocumentsParams,
  ListSignRequestsParams,
  SignDocument,
  SignEvent,
  SignRequest,
  SignSession,
  SignSettings,
  UpdateSignSettingsParams,
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

/** `coss.sign.sessions`: signing links for signers who sign in your app. */
export class SignSessionsResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().sign.sessions`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /**
   * A short-lived signing link for one `embedded` signer of a sent request. Create it when that
   * signed-in user opens the page that shows it: your app vouches for who they are.
   */
  create(
    requestId: string,
    signerId: string,
    params: CreateSignSessionParams = {},
    options?: RequestOptions,
  ): Promise<CossResult<SignSession>> {
    return this.#http.request<SignSession>({
      method: "POST",
      path: `/v1/sign/requests/${encodeURIComponent(requestId)}/signers/${encodeURIComponent(signerId)}/sessions`,
      body: params,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }
}

/** `coss.sign.settings`: the environment's signing page settings. */
export class SignSettingsResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().sign.settings`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** Which sites may embed the signing page, how it looks, and what signers consent to. */
  get(options?: ReadOptions): Promise<CossResult<SignSettings>> {
    return this.#http.request<SignSettings>({
      method: "GET",
      path: "/v1/sign/settings",
      signal: options?.signal,
    });
  }

  /** Changes the fields given; the others keep their values. */
  update(
    params: UpdateSignSettingsParams,
    options?: ReadOptions,
  ): Promise<CossResult<SignSettings>> {
    return this.#http.request<SignSettings>({
      method: "PATCH",
      path: "/v1/sign/settings",
      body: params,
      signal: options?.signal,
    });
  }
}

/** `coss.sign`: e-signatures: documents, signature requests, signing sessions and settings. */
export class SignResource {
  readonly documents: SignDocumentsResource;
  readonly requests: SignRequestsResource;
  readonly sessions: SignSessionsResource;
  readonly settings: SignSettingsResource;

  /** @internal Use `new Coss().sign`. */
  constructor(http: HttpClient) {
    this.documents = new SignDocumentsResource(http);
    this.requests = new SignRequestsResource(http);
    this.sessions = new SignSessionsResource(http);
    this.settings = new SignSettingsResource(http);
  }
}
