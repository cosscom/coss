import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type { List } from "../types/email.ts";
import type {
  CreateInboxParams,
  DeletedInbox,
  DeletedInboxThread,
  Inbox,
  InboxMessage,
  InboxMessageSummary,
  InboxThread,
  InboxThreadSummary,
  ListInboxesParams,
  ListInboxMessagesParams,
  ListInboxThreadsParams,
  ReplyInboxMessageParams,
  SendInboxMessageParams,
  UpdateInboxParams,
} from "../types/inbox.ts";
import { listQuery } from "./list-query.ts";

type ReadOptions = Pick<RequestOptions, "signal">;

const inboxPath = (id: string) => `/v1/inboxes/${encodeURIComponent(id)}`;

/** `coss.inboxes.threads`: an inbox's conversations. */
export class InboxThreadsResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().inboxes.threads`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** Lists the inbox's threads, latest activity first. Pass the last `id` as `after` while `has_more` is true. */
  list(
    inboxId: string,
    params: ListInboxThreadsParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<List<InboxThreadSummary>>> {
    return this.#http.request<List<InboxThreadSummary>>({
      method: "GET",
      path: `${inboxPath(inboxId)}/threads`,
      query: listQuery(params),
      signal: options?.signal,
    });
  }

  /** Retrieves a thread with its latest messages, oldest first: what to read before replying. */
  get(inboxId: string, threadId: string, options?: ReadOptions): Promise<CossResult<InboxThread>> {
    return this.#http.request<InboxThread>({
      method: "GET",
      path: `${inboxPath(inboxId)}/threads/${encodeURIComponent(threadId)}`,
      signal: options?.signal,
    });
  }

  /** Removes a thread from the inbox (its emails stay in the environment). */
  delete(
    inboxId: string,
    threadId: string,
    options?: ReadOptions,
  ): Promise<CossResult<DeletedInboxThread>> {
    return this.#http.request<DeletedInboxThread>({
      method: "DELETE",
      path: `${inboxPath(inboxId)}/threads/${encodeURIComponent(threadId)}`,
      signal: options?.signal,
    });
  }
}

/** `coss.inboxes.messages`: an inbox's messages, sends and replies. */
export class InboxMessagesResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().inboxes.messages`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** Lists messages of every thread, newest first, with a preview instead of bodies. */
  list(
    inboxId: string,
    params: ListInboxMessagesParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<List<InboxMessageSummary>>> {
    return this.#http.request<List<InboxMessageSummary>>({
      method: "GET",
      path: `${inboxPath(inboxId)}/messages`,
      query: listQuery(params),
      signal: options?.signal,
    });
  }

  /** Retrieves a message with its text, HTML and `extracted_text`. */
  get(
    inboxId: string,
    messageId: string,
    options?: ReadOptions,
  ): Promise<CossResult<InboxMessage>> {
    return this.#http.request<InboxMessage>({
      method: "GET",
      path: `${inboxPath(inboxId)}/messages/${encodeURIComponent(messageId)}`,
      signal: options?.signal,
    });
  }

  /**
   * Starts a thread with a message from the inbox's address. Safe to retry: the request carries an
   * `Idempotency-Key` (yours, or a generated one reused across retries).
   */
  send(
    inboxId: string,
    params: SendInboxMessageParams,
    options?: RequestOptions,
  ): Promise<CossResult<InboxMessage>> {
    return this.#http.request<InboxMessage>({
      method: "POST",
      path: `${inboxPath(inboxId)}/messages`,
      body: params,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  /**
   * Replies in the message's thread: to its sender (or, for the inbox's own message, its
   * recipients); `reply_all` adds everyone else on it. Safe to retry, like `send`.
   */
  reply(
    inboxId: string,
    messageId: string,
    params: ReplyInboxMessageParams,
    options?: RequestOptions,
  ): Promise<CossResult<InboxMessage>> {
    return this.#http.request<InboxMessage>({
      method: "POST",
      path: `${inboxPath(inboxId)}/messages/${encodeURIComponent(messageId)}/reply`,
      body: params,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  /** An inbound message's attachment (untrusted bytes: its declared type is `content_type`). */
  getAttachment(
    inboxId: string,
    messageId: string,
    attachmentId: string,
    options?: ReadOptions,
  ): Promise<CossResult<Uint8Array>> {
    return this.#http.request<Uint8Array>({
      method: "GET",
      path: `${inboxPath(inboxId)}/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
      responseType: "bytes",
      signal: options?.signal,
    });
  }
}

/**
 * `coss.inboxes`: email addresses for agents. Mail to an inbox is kept as threads, and each
 * message that arrives sends an `inbox.message.received` webhook.
 */
export class InboxesResource {
  readonly #http: HttpClient;
  readonly threads: InboxThreadsResource;
  readonly messages: InboxMessagesResource;

  /** @internal Use `new Coss().inboxes`. */
  constructor(http: HttpClient) {
    this.#http = http;
    this.threads = new InboxThreadsResource(http);
    this.messages = new InboxMessagesResource(http);
  }

  /**
   * Creates an inbox: `username@<the environment's inbound domain>` (no DNS setup), or at one of
   * its receiving domains. With a `client_id` that already has one, returns that inbox; only
   * then is the call retried (otherwise a retry could create a second inbox).
   */
  create(params: CreateInboxParams = {}, options?: RequestOptions): Promise<CossResult<Inbox>> {
    return this.#http.request<Inbox>({
      method: "POST",
      path: "/v1/inboxes",
      body: params,
      retry: params.client_id !== undefined,
      signal: options?.signal,
    });
  }

  /** Lists the environment's inboxes, newest first. Pass the last `id` as `after` while `has_more` is true. */
  list(params: ListInboxesParams = {}, options?: ReadOptions): Promise<CossResult<List<Inbox>>> {
    return this.#http.request<List<Inbox>>({
      method: "GET",
      path: "/v1/inboxes",
      query: listQuery(params),
      signal: options?.signal,
    });
  }

  /** Retrieves an inbox. */
  get(id: string, options?: ReadOptions): Promise<CossResult<Inbox>> {
    return this.#http.request<Inbox>({
      method: "GET",
      path: inboxPath(id),
      signal: options?.signal,
    });
  }

  /** Changes the name messages from the inbox are sent with. */
  update(id: string, params: UpdateInboxParams, options?: ReadOptions): Promise<CossResult<Inbox>> {
    return this.#http.request<Inbox>({
      method: "PATCH",
      path: inboxPath(id),
      body: params,
      signal: options?.signal,
    });
  }

  /** Deletes an inbox and its threads (their emails stay in the environment). */
  delete(id: string, options?: ReadOptions): Promise<CossResult<DeletedInbox>> {
    return this.#http.request<DeletedInbox>({
      method: "DELETE",
      path: inboxPath(id),
      signal: options?.signal,
    });
  }
}
