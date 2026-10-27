import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type { List } from "../types/email.ts";
import type {
  CreateSignBuilderSessionParams,
  CreateSignRequestFromTemplateParams,
  CreateSignRequestParams,
  CreateSignSessionParams,
  CreateSignTemplateParams,
  DeletedSignDocument,
  DeletedSignRequest,
  DeletedSignTemplate,
  ListSignDocumentsParams,
  ListSignRequestsParams,
  ListSignTemplatesParams,
  SignBuilderSession,
  SignDocument,
  SignEvent,
  SignRequest,
  SignSession,
  SignSettings,
  SignTemplate,
  UpdateSignSettingsParams,
  UpdateSignTemplateParams,
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

  /**
   * Deletes a request that isn't `sent` (cancel it first), with its audit trail, signatures and
   * signed document, for good. Its documents stay.
   */
  remove(id: string, options?: ReadOptions): Promise<CossResult<DeletedSignRequest>> {
    return this.#http.request<DeletedSignRequest>({
      method: "DELETE",
      path: `/v1/sign/requests/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
  }

  /**
   * Emails a reminder (with a fresh link) to the email signers who haven't signed and whose turn
   * it is, unless they were emailed in the last hour (`reminder_not_due` when nobody is left).
   * Not retried automatically: a retry after a lost answer would be `reminder_not_due`.
   */
  remind(id: string, options?: ReadOptions): Promise<CossResult<SignRequest>> {
    return this.#http.request<SignRequest>({
      method: "POST",
      path: `/v1/sign/requests/${encodeURIComponent(id)}/remind`,
      retry: false,
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

  /**
   * The completed request's sealed PDF (the documents as signed, then a certificate of
   * completion). Ready once `signed_document` is set: the `sign_request.completed` webhook says so.
   */
  signedDocument(id: string, options?: ReadOptions): Promise<CossResult<Uint8Array>> {
    return this.#http.request<Uint8Array>({
      method: "GET",
      path: `/v1/sign/requests/${encodeURIComponent(id)}/signed_document`,
      responseType: "bytes",
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

/** `coss.sign.templates`: reusable documents with fields for roles. */
export class SignTemplatesResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().sign.templates`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /**
   * Creates a template (it may start empty and be built in the embedded builder). Not retried
   * automatically: a retry would create a second one.
   */
  create(
    params: CreateSignTemplateParams,
    options?: ReadOptions,
  ): Promise<CossResult<SignTemplate>> {
    return this.#http.request<SignTemplate>({
      method: "POST",
      path: "/v1/sign/templates",
      body: params,
      retry: false,
      signal: options?.signal,
    });
  }

  /** Lists templates, newest first. Pass the last `id` as `after` while `has_more` is true. */
  list(
    params: ListSignTemplatesParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<List<SignTemplate>>> {
    return this.#http.request<List<SignTemplate>>({
      method: "GET",
      path: "/v1/sign/templates",
      query: listQuery(params),
      signal: options?.signal,
    });
  }

  get(id: string, options?: ReadOptions): Promise<CossResult<SignTemplate>> {
    return this.#http.request<SignTemplate>({
      method: "GET",
      path: `/v1/sign/templates/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
  }

  /**
   * Changes the fields given; `documents`, `roles` and `fields` replace the whole list. Not
   * retried automatically when it uploads documents (`content`): a retry would upload them again.
   */
  update(
    id: string,
    params: UpdateSignTemplateParams,
    options?: ReadOptions,
  ): Promise<CossResult<SignTemplate>> {
    return this.#http.request<SignTemplate>({
      method: "PATCH",
      path: `/v1/sign/templates/${encodeURIComponent(id)}`,
      body: params,
      retry: !params.documents?.some((document) => "content" in document),
      signal: options?.signal,
    });
  }

  /** Deletes a template; requests made from it and its documents stay. */
  remove(id: string, options?: ReadOptions): Promise<CossResult<DeletedSignTemplate>> {
    return this.#http.request<DeletedSignTemplate>({
      method: "DELETE",
      path: `/v1/sign/templates/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
  }

  /**
   * A signature request from the template: one signer per role, merge fields filled in. Safe to
   * retry: every request carries an `Idempotency-Key`.
   */
  createRequest(
    id: string,
    params: CreateSignRequestFromTemplateParams,
    options?: RequestOptions,
  ): Promise<CossResult<SignRequest>> {
    return this.#http.request<SignRequest>({
      method: "POST",
      path: `/v1/sign/templates/${encodeURIComponent(id)}/requests`,
      body: params,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  /** A short-lived link to the embedded builder for this template (`mountBuilder`). */
  createBuilderSession(
    id: string,
    params: CreateSignBuilderSessionParams = {},
    options?: RequestOptions,
  ): Promise<CossResult<SignBuilderSession>> {
    return this.#http.request<SignBuilderSession>({
      method: "POST",
      path: `/v1/sign/templates/${encodeURIComponent(id)}/builder_sessions`,
      body: params,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }
}

/**
 * `coss.sign`: e-signatures: documents, signature requests, templates, signing sessions and
 * settings.
 */
export class SignResource {
  readonly documents: SignDocumentsResource;
  readonly requests: SignRequestsResource;
  readonly templates: SignTemplatesResource;
  readonly sessions: SignSessionsResource;
  readonly settings: SignSettingsResource;

  /** @internal Use `new Coss().sign`. */
  constructor(http: HttpClient) {
    this.documents = new SignDocumentsResource(http);
    this.requests = new SignRequestsResource(http);
    this.templates = new SignTemplatesResource(http);
    this.sessions = new SignSessionsResource(http);
    this.settings = new SignSettingsResource(http);
  }
}
