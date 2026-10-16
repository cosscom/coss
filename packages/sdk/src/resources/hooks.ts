import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type { List } from "../types/email.ts";
import type {
  CreateHookApplicationParams,
  CreateHookEndpointParams,
  CreateHookEventTypeParams,
  CreateHookPortalSessionParams,
  DeletedHookApplication,
  DeletedHookEndpoint,
  HookApplication,
  HookAttempt,
  HookDelivery,
  HookEndpoint,
  HookEndpointRecovery,
  HookEndpointSecret,
  HookEndpointWithSecret,
  HookEventType,
  HookMessage,
  HookPortalSession,
  ListHookApplicationsParams,
  ListHookDeliveriesParams,
  ListHookEventTypesParams,
  ListHookMessagesParams,
  RecoverHookEndpointParams,
  RollHookEndpointSecretParams,
  SendHookMessageParams,
  SendHookTestParams,
  UpdateHookApplicationParams,
  UpdateHookEndpointParams,
  UpdateHookEventTypeParams,
} from "../types/hooks.ts";
import { listQuery } from "./list-query.ts";

type ReadOptions = Pick<RequestOptions, "signal">;

const segment = encodeURIComponent;
const applicationPath = (application: string) => `/v1/hooks/applications/${segment(application)}`;
const endpointPath = (application: string, id: string) =>
  `${applicationPath(application)}/endpoints/${segment(id)}`;

/** `coss.hooks.applications`: your customers, each with their own endpoints and portal. */
export class HookApplicationsResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().hooks.applications`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** Creates an application. Never automatically retried (the API does not deduplicate it). */
  create(
    params: CreateHookApplicationParams,
    options?: RequestOptions,
  ): Promise<CossResult<HookApplication>> {
    return this.#http.request<HookApplication>({
      method: "POST",
      path: "/v1/hooks/applications",
      retry: false,
      body: params,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  /** Lists the environment's applications, newest first. */
  list(
    params: ListHookApplicationsParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<List<HookApplication>>> {
    return this.#http.request<List<HookApplication>>({
      method: "GET",
      path: "/v1/hooks/applications",
      query: listQuery(params),
      signal: options?.signal,
    });
  }

  /** Retrieves an application by its id or uid. */
  get(application: string, options?: ReadOptions): Promise<CossResult<HookApplication>> {
    return this.#http.request<HookApplication>({
      method: "GET",
      path: applicationPath(application),
      signal: options?.signal,
    });
  }

  update(
    application: string,
    params: UpdateHookApplicationParams,
    options?: ReadOptions,
  ): Promise<CossResult<HookApplication>> {
    return this.#http.request<HookApplication>({
      method: "PATCH",
      path: applicationPath(application),
      body: params,
      signal: options?.signal,
    });
  }

  /** Deletes the application with its endpoints and portal sessions. */
  delete(application: string, options?: ReadOptions): Promise<CossResult<DeletedHookApplication>> {
    return this.#http.request<DeletedHookApplication>({
      method: "DELETE",
      path: applicationPath(application),
      signal: options?.signal,
    });
  }
}

/** `coss.hooks.eventTypes`: the catalog of messages you send, which your users subscribe from. */
export class HookEventTypesResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().hooks.eventTypes`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** Creates an event type. Never automatically retried (a retry would find it existing). */
  create(
    params: CreateHookEventTypeParams,
    options?: RequestOptions,
  ): Promise<CossResult<HookEventType>> {
    return this.#http.request<HookEventType>({
      method: "POST",
      path: "/v1/hooks/event_types",
      retry: false,
      body: params,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  /** Lists event types by name (archived ones only with `include_archived`). */
  list(
    params: ListHookEventTypesParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<List<HookEventType>>> {
    return this.#http.request<List<HookEventType>>({
      method: "GET",
      path: "/v1/hooks/event_types",
      query: listQuery(params),
      signal: options?.signal,
    });
  }

  get(name: string, options?: ReadOptions): Promise<CossResult<HookEventType>> {
    return this.#http.request<HookEventType>({
      method: "GET",
      path: `/v1/hooks/event_types/${segment(name)}`,
      signal: options?.signal,
    });
  }

  /** Changes its description, schema or examples, or archives or restores it. */
  update(
    name: string,
    params: UpdateHookEventTypeParams,
    options?: ReadOptions,
  ): Promise<CossResult<HookEventType>> {
    return this.#http.request<HookEventType>({
      method: "PATCH",
      path: `/v1/hooks/event_types/${segment(name)}`,
      body: params,
      signal: options?.signal,
    });
  }

  /** Archives it: hidden from the portal and new subscriptions. */
  archive(name: string, options?: ReadOptions): Promise<CossResult<HookEventType>> {
    return this.#http.request<HookEventType>({
      method: "DELETE",
      path: `/v1/hooks/event_types/${segment(name)}`,
      signal: options?.signal,
    });
  }
}

/** `coss.hooks.endpoints`: an application's endpoints (usually added by its users in the portal). */
export class HookEndpointsResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().hooks.endpoints`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** Creates an endpoint; the result carries its secret. Never automatically retried. */
  create(
    application: string,
    params: CreateHookEndpointParams,
    options?: RequestOptions,
  ): Promise<CossResult<HookEndpointWithSecret>> {
    return this.#http.request<HookEndpointWithSecret>({
      method: "POST",
      path: `${applicationPath(application)}/endpoints`,
      retry: false,
      body: params,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  list(application: string, options?: ReadOptions): Promise<CossResult<List<HookEndpoint>>> {
    return this.#http.request<List<HookEndpoint>>({
      method: "GET",
      path: `${applicationPath(application)}/endpoints`,
      signal: options?.signal,
    });
  }

  get(application: string, id: string, options?: ReadOptions): Promise<CossResult<HookEndpoint>> {
    return this.#http.request<HookEndpoint>({
      method: "GET",
      path: endpointPath(application, id),
      signal: options?.signal,
    });
  }

  update(
    application: string,
    id: string,
    params: UpdateHookEndpointParams,
    options?: ReadOptions,
  ): Promise<CossResult<HookEndpoint>> {
    return this.#http.request<HookEndpoint>({
      method: "PATCH",
      path: endpointPath(application, id),
      body: params,
      signal: options?.signal,
    });
  }

  delete(
    application: string,
    id: string,
    options?: ReadOptions,
  ): Promise<CossResult<DeletedHookEndpoint>> {
    return this.#http.request<DeletedHookEndpoint>({
      method: "DELETE",
      path: endpointPath(application, id),
      signal: options?.signal,
    });
  }

  /** The endpoint's current signing secret. */
  getSecret(
    application: string,
    id: string,
    options?: ReadOptions,
  ): Promise<CossResult<HookEndpointSecret>> {
    return this.#http.request<HookEndpointSecret>({
      method: "GET",
      path: `${endpointPath(application, id)}/secret`,
      signal: options?.signal,
    });
  }

  /** Replaces the signing secret. Never automatically retried (a second roll would stop the first). */
  rollSecret(
    application: string,
    id: string,
    params: RollHookEndpointSecretParams = {},
    options?: RequestOptions,
  ): Promise<CossResult<HookEndpointWithSecret>> {
    return this.#http.request<HookEndpointWithSecret>({
      method: "POST",
      path: `${endpointPath(application, id)}/roll_secret`,
      retry: false,
      body: params,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  /** Requeues the endpoint's failed deliveries of messages sent since `since` (in the background). */
  recover(
    application: string,
    id: string,
    params: RecoverHookEndpointParams,
    options?: RequestOptions,
  ): Promise<CossResult<HookEndpointRecovery>> {
    const since = params.since instanceof Date ? params.since.toISOString() : params.since;
    return this.#http.request<HookEndpointRecovery>({
      method: "POST",
      path: `${endpointPath(application, id)}/recover`,
      body: { since },
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  getRecovery(
    application: string,
    id: string,
    recoveryId: string,
    options?: ReadOptions,
  ): Promise<CossResult<HookEndpointRecovery>> {
    return this.#http.request<HookEndpointRecovery>({
      method: "GET",
      path: `${endpointPath(application, id)}/recoveries/${segment(recoveryId)}`,
      signal: options?.signal,
    });
  }

  /** Sends a message to this endpoint only. Never automatically retried. */
  sendTest(
    application: string,
    id: string,
    params: SendHookTestParams,
    options?: RequestOptions,
  ): Promise<CossResult<HookMessage>> {
    return this.#http.request<HookMessage>({
      method: "POST",
      path: `${endpointPath(application, id)}/test`,
      retry: false,
      body: params,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  /** The endpoint's deliveries, newest first. */
  listDeliveries(
    application: string,
    id: string,
    params: ListHookDeliveriesParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<List<HookDelivery>>> {
    return this.#http.request<List<HookDelivery>>({
      method: "GET",
      path: `${endpointPath(application, id)}/deliveries`,
      query: listQuery(params),
      signal: options?.signal,
    });
  }
}

/** `coss.hooks.messages`: send a message once; coss.com delivers it to every subscribed endpoint. */
export class HookMessagesResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().hooks.messages`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /**
   * Sends a message to an application. Safe to retry: every attempt carries the same
   * `Idempotency-Key`, so a retried send is delivered once.
   */
  send(params: SendHookMessageParams, options?: RequestOptions): Promise<CossResult<HookMessage>> {
    const { application, ...body } = params;
    return this.#http.request<HookMessage>({
      method: "POST",
      path: `${applicationPath(application)}/messages`,
      body,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  /** The application's messages, newest first. */
  list(
    application: string,
    params: ListHookMessagesParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<List<HookMessage>>> {
    return this.#http.request<List<HookMessage>>({
      method: "GET",
      path: `${applicationPath(application)}/messages`,
      query: listQuery(params),
      signal: options?.signal,
    });
  }

  get(application: string, id: string, options?: ReadOptions): Promise<CossResult<HookMessage>> {
    return this.#http.request<HookMessage>({
      method: "GET",
      path: `${applicationPath(application)}/messages/${segment(id)}`,
      signal: options?.signal,
    });
  }

  /** One delivery per endpoint the message went to. */
  listDeliveries(
    application: string,
    id: string,
    options?: ReadOptions,
  ): Promise<CossResult<List<HookDelivery>>> {
    return this.#http.request<List<HookDelivery>>({
      method: "GET",
      path: `${applicationPath(application)}/messages/${segment(id)}/deliveries`,
      signal: options?.signal,
    });
  }
}

/** `coss.hooks.deliveries`: one message's delivery to one endpoint. */
export class HookDeliveriesResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().hooks.deliveries`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  get(application: string, id: string, options?: ReadOptions): Promise<CossResult<HookDelivery>> {
    return this.#http.request<HookDelivery>({
      method: "GET",
      path: `${applicationPath(application)}/deliveries/${segment(id)}`,
      signal: options?.signal,
    });
  }

  /** Every HTTP request of the delivery, oldest first. */
  listAttempts(
    application: string,
    id: string,
    options?: ReadOptions,
  ): Promise<CossResult<List<HookAttempt>>> {
    return this.#http.request<List<HookAttempt>>({
      method: "GET",
      path: `${applicationPath(application)}/deliveries/${segment(id)}/attempts`,
      signal: options?.signal,
    });
  }

  /** Queues a finished delivery for one more attempt. Never automatically retried. */
  retry(
    application: string,
    id: string,
    options?: RequestOptions,
  ): Promise<CossResult<HookDelivery>> {
    return this.#http.request<HookDelivery>({
      method: "POST",
      path: `${applicationPath(application)}/deliveries/${segment(id)}/retry`,
      retry: false,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }
}

/** `coss.hooks.portal`: a ready-made page for an application's user to manage their endpoints. */
export class HookPortalResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().hooks.portal`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /**
   * Signs the application's user in to the portal: open or embed the returned `url`. Call it from
   * your backend each time the user opens the portal.
   */
  createSession(
    params: CreateHookPortalSessionParams,
    options?: RequestOptions,
  ): Promise<CossResult<HookPortalSession>> {
    const { application, ...body } = params;
    return this.#http.request<HookPortalSession>({
      method: "POST",
      path: `${applicationPath(application)}/portal_sessions`,
      body,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }
}

/**
 * `coss.hooks`: webhooks as a service. Send a message to one of your applications once
 * (`coss.hooks.messages.send`); coss.com delivers it to every endpoint its users registered, signed
 * (Standard Webhooks), with retries, and gives them a portal to manage it all.
 */
export class HooksResource {
  readonly applications: HookApplicationsResource;
  readonly eventTypes: HookEventTypesResource;
  readonly endpoints: HookEndpointsResource;
  readonly messages: HookMessagesResource;
  readonly deliveries: HookDeliveriesResource;
  readonly portal: HookPortalResource;

  /** @internal Use `new Coss().hooks`. */
  constructor(http: HttpClient) {
    this.applications = new HookApplicationsResource(http);
    this.eventTypes = new HookEventTypesResource(http);
    this.endpoints = new HookEndpointsResource(http);
    this.messages = new HookMessagesResource(http);
    this.deliveries = new HookDeliveriesResource(http);
    this.portal = new HookPortalResource(http);
  }
}
