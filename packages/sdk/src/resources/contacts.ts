import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type {
  AddAudienceContactsParams,
  Audience,
  AudienceContactsAdded,
  AudienceParams,
  Contact,
  ContactImport,
  ContactProperty,
  ContactTopics,
  CreateContactPropertyParams,
  CreateSegmentParams,
  CreateTopicParams,
  DeletedAudience,
  DeletedContact,
  DeletedContactProperty,
  DeletedSegment,
  DeletedTopic,
  ExportContactsParams,
  ImportContactsParams,
  ListContactsParams,
  ListParams,
  MarketingSettings,
  RemovedAudienceContact,
  Segment,
  Topic,
  UpdateContactParams,
  UpdateContactPropertyParams,
  UpdateContactTopicsParams,
  UpdateMarketingSettingsParams,
  UpdateSegmentParams,
  UpdateTopicParams,
  UpsertContactParams,
} from "../types/contact.ts";
import type { List } from "../types/email.ts";

type ReadOptions = Pick<RequestOptions, "signal">;

/** The API's per-request maximum for imports. */
const IMPORT_BATCH_SIZE = 1000;

const path = (...parts: string[]) => parts.map(encodeURIComponent).join("/");

/** `coss.email.contacts.properties`: the environment's custom contact properties. */
export class ContactPropertiesResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().email.contacts.properties`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** Every property (at most 50), by key. */
  list(options?: ReadOptions): Promise<CossResult<List<ContactProperty>>> {
    return this.#http.request({
      method: "GET",
      path: "/v1/contact_properties",
      signal: options?.signal,
    });
  }

  /** Defines a property contacts can have; its key and type can't change. */
  create(
    params: CreateContactPropertyParams,
    options?: ReadOptions,
  ): Promise<CossResult<ContactProperty>> {
    return this.#http.request({
      method: "POST",
      path: "/v1/contact_properties",
      body: params,
      signal: options?.signal,
    });
  }

  get(id: string, options?: ReadOptions): Promise<CossResult<ContactProperty>> {
    return this.#http.request({
      method: "GET",
      path: `/v1/contact_properties/${path(id)}`,
      signal: options?.signal,
    });
  }

  /** Changes the fallback templates use for contacts without a value. */
  update(
    id: string,
    params: UpdateContactPropertyParams,
    options?: ReadOptions,
  ): Promise<CossResult<ContactProperty>> {
    return this.#http.request({
      method: "PATCH",
      path: `/v1/contact_properties/${path(id)}`,
      body: params,
      signal: options?.signal,
    });
  }

  /** Deletes the property and its values; refused while a segment filters on it. */
  remove(id: string, options?: ReadOptions): Promise<CossResult<DeletedContactProperty>> {
    return this.#http.request({
      method: "DELETE",
      path: `/v1/contact_properties/${path(id)}`,
      signal: options?.signal,
    });
  }
}

/**
 * `coss.email.contacts`: the people marketing email goes to, in the API key's environment, with
 * custom properties and consent (overall, and per topic). Methods taking an id also take the
 * contact's address.
 */
export class ContactsResource {
  readonly #http: HttpClient;
  /** Custom contact properties. */
  readonly properties: ContactPropertiesResource;

  /** @internal Use `new Coss().email.contacts`. */
  constructor(http: HttpClient) {
    this.#http = http;
    this.properties = new ContactPropertiesResource(http);
  }

  /**
   * Creates the contact with this address, or updates the existing one (names replaced,
   * properties merged, audiences added, topic choices recorded; `status` only when passed).
   * Safe to retry.
   */
  upsert(params: UpsertContactParams, options?: ReadOptions): Promise<CossResult<Contact>> {
    return this.#http.request({
      method: "POST",
      path: "/v1/contacts",
      body: params,
      signal: options?.signal,
    });
  }

  /** Lists contacts, newest first. Pass the last `id` as `after` while `has_more` is true. */
  list(params: ListContactsParams = {}, options?: ReadOptions): Promise<CossResult<List<Contact>>> {
    return this.#http.request({
      method: "GET",
      path: "/v1/contacts",
      query: { ...params },
      signal: options?.signal,
    });
  }

  get(idOrEmail: string, options?: ReadOptions): Promise<CossResult<Contact>> {
    return this.#http.request({
      method: "GET",
      path: `/v1/contacts/${path(idOrEmail)}`,
      signal: options?.signal,
    });
  }

  update(
    idOrEmail: string,
    params: UpdateContactParams,
    options?: ReadOptions,
  ): Promise<CossResult<Contact>> {
    return this.#http.request({
      method: "PATCH",
      path: `/v1/contacts/${path(idOrEmail)}`,
      body: params,
      signal: options?.signal,
    });
  }

  /** Deletes the contact (its suppressions stay: they are about the address). */
  remove(idOrEmail: string, options?: ReadOptions): Promise<CossResult<DeletedContact>> {
    return this.#http.request({
      method: "DELETE",
      path: `/v1/contacts/${path(idOrEmail)}`,
      signal: options?.signal,
    });
  }

  /**
   * Creates or updates many contacts, 1,000 per request. Invalid entries are skipped and reported
   * in `invalid`; an import never re-subscribes an unsubscribed contact. If a request fails, the
   * earlier batches stay imported: importing everything again is safe.
   */
  async import(
    params: ImportContactsParams,
    options?: ReadOptions,
  ): Promise<CossResult<ContactImport>> {
    const total: ContactImport = {
      object: "contact_import",
      created: 0,
      updated: 0,
      kept_unsubscribed: 0,
      invalid: [],
    };
    // An empty list still gets one request, so the API reports it like any other invalid input.
    for (let start = 0; start === 0 || start < params.contacts.length; ) {
      const result = await this.#http.request<ContactImport>({
        method: "POST",
        path: "/v1/contacts/import",
        body: {
          contacts: params.contacts.slice(start, start + IMPORT_BATCH_SIZE),
          ...(params.audience_id === undefined ? {} : { audience_id: params.audience_id }),
        },
        signal: options?.signal,
      });
      if (result.error) return result;
      total.created += result.data.created;
      total.updated += result.data.updated;
      total.kept_unsubscribed += result.data.kept_unsubscribed;
      for (const entry of result.data.invalid) {
        total.invalid.push({ ...entry, index: entry.index + start });
      }
      start += IMPORT_BATCH_SIZE;
    }
    return { data: total, error: null };
  }

  /** The contacts as CSV (one column per custom property), which `import` accepts again. */
  export(params: ExportContactsParams = {}, options?: ReadOptions): Promise<CossResult<string>> {
    return this.#http.request<string>({
      method: "GET",
      path: "/v1/contacts/export",
      query: { ...params },
      responseType: "text",
      signal: options?.signal,
    });
  }

  /** Every topic with the contact's choice and whether its emails reach them. */
  getTopics(idOrEmail: string, options?: ReadOptions): Promise<CossResult<ContactTopics>> {
    return this.#http.request({
      method: "GET",
      path: `/v1/contacts/${path(idOrEmail)}/topics`,
      signal: options?.signal,
    });
  }

  /** Records the contact's choices for some topics. */
  updateTopics(
    idOrEmail: string,
    params: UpdateContactTopicsParams,
    options?: ReadOptions,
  ): Promise<CossResult<ContactTopics>> {
    return this.#http.request({
      method: "PATCH",
      path: `/v1/contacts/${path(idOrEmail)}/topics`,
      body: params,
      signal: options?.signal,
    });
  }
}

/** `coss.email.audiences`: static lists of contacts. */
export class AudiencesResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().email.audiences`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  list(params: ListParams = {}, options?: ReadOptions): Promise<CossResult<List<Audience>>> {
    return this.#http.request({
      method: "GET",
      path: "/v1/audiences",
      query: { ...params },
      signal: options?.signal,
    });
  }

  create(params: AudienceParams, options?: ReadOptions): Promise<CossResult<Audience>> {
    return this.#http.request({
      method: "POST",
      path: "/v1/audiences",
      body: params,
      signal: options?.signal,
    });
  }

  get(id: string, options?: ReadOptions): Promise<CossResult<Audience>> {
    return this.#http.request({
      method: "GET",
      path: `/v1/audiences/${path(id)}`,
      signal: options?.signal,
    });
  }

  /** Renames the audience. */
  update(id: string, params: AudienceParams, options?: ReadOptions): Promise<CossResult<Audience>> {
    return this.#http.request({
      method: "PATCH",
      path: `/v1/audiences/${path(id)}`,
      body: params,
      signal: options?.signal,
    });
  }

  /** Deletes the audience (its contacts stay); refused while a segment filters on it. */
  remove(id: string, options?: ReadOptions): Promise<CossResult<DeletedAudience>> {
    return this.#http.request({
      method: "DELETE",
      path: `/v1/audiences/${path(id)}`,
      signal: options?.signal,
    });
  }

  /** The audience's members, newest first. */
  listContacts(
    id: string,
    params: ListParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<List<Contact>>> {
    return this.#http.request({
      method: "GET",
      path: `/v1/audiences/${path(id)}/contacts`,
      query: { ...params },
      signal: options?.signal,
    });
  }

  /** Adds existing contacts, by id or address (up to 1,000 per call). */
  addContacts(
    id: string,
    params: AddAudienceContactsParams,
    options?: ReadOptions,
  ): Promise<CossResult<AudienceContactsAdded>> {
    return this.#http.request({
      method: "POST",
      path: `/v1/audiences/${path(id)}/contacts`,
      body: params,
      signal: options?.signal,
    });
  }

  removeContact(
    id: string,
    contactIdOrEmail: string,
    options?: ReadOptions,
  ): Promise<CossResult<RemovedAudienceContact>> {
    return this.#http.request({
      method: "DELETE",
      path: `/v1/audiences/${path(id)}/contacts/${path(contactIdOrEmail)}`,
      signal: options?.signal,
    });
  }
}

/** `coss.email.segments`: filters over the environment's contacts, always current. */
export class SegmentsResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().email.segments`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  list(params: ListParams = {}, options?: ReadOptions): Promise<CossResult<List<Segment>>> {
    return this.#http.request({
      method: "GET",
      path: "/v1/segments",
      query: { ...params },
      signal: options?.signal,
    });
  }

  create(params: CreateSegmentParams, options?: ReadOptions): Promise<CossResult<Segment>> {
    return this.#http.request({
      method: "POST",
      path: "/v1/segments",
      body: params,
      signal: options?.signal,
    });
  }

  get(id: string, options?: ReadOptions): Promise<CossResult<Segment>> {
    return this.#http.request({
      method: "GET",
      path: `/v1/segments/${path(id)}`,
      signal: options?.signal,
    });
  }

  update(
    id: string,
    params: UpdateSegmentParams,
    options?: ReadOptions,
  ): Promise<CossResult<Segment>> {
    return this.#http.request({
      method: "PATCH",
      path: `/v1/segments/${path(id)}`,
      body: params,
      signal: options?.signal,
    });
  }

  remove(id: string, options?: ReadOptions): Promise<CossResult<DeletedSegment>> {
    return this.#http.request({
      method: "DELETE",
      path: `/v1/segments/${path(id)}`,
      signal: options?.signal,
    });
  }

  /** The contacts the filter matches now, whatever their status, newest first. */
  listContacts(
    id: string,
    params: ListParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<List<Contact>>> {
    return this.#http.request({
      method: "GET",
      path: `/v1/segments/${path(id)}/contacts`,
      query: { ...params },
      signal: options?.signal,
    });
  }
}

/** `coss.email.topics`: what contacts subscribe to (a topic's key is a send's `category`). */
export class TopicsResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().email.topics`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  list(params: ListParams = {}, options?: ReadOptions): Promise<CossResult<List<Topic>>> {
    return this.#http.request({
      method: "GET",
      path: "/v1/topics",
      query: { ...params },
      signal: options?.signal,
    });
  }

  create(params: CreateTopicParams, options?: ReadOptions): Promise<CossResult<Topic>> {
    return this.#http.request({
      method: "POST",
      path: "/v1/topics",
      body: params,
      signal: options?.signal,
    });
  }

  get(id: string, options?: ReadOptions): Promise<CossResult<Topic>> {
    return this.#http.request({
      method: "GET",
      path: `/v1/topics/${path(id)}`,
      signal: options?.signal,
    });
  }

  update(id: string, params: UpdateTopicParams, options?: ReadOptions): Promise<CossResult<Topic>> {
    return this.#http.request({
      method: "PATCH",
      path: `/v1/topics/${path(id)}`,
      body: params,
      signal: options?.signal,
    });
  }

  /** Deletes the topic and every contact's choice for it. */
  remove(id: string, options?: ReadOptions): Promise<CossResult<DeletedTopic>> {
    return this.#http.request({
      method: "DELETE",
      path: `/v1/topics/${path(id)}`,
      signal: options?.signal,
    });
  }
}

/** `coss.email.marketingSettings`: the sender name and postal address of marketing email. */
export class MarketingSettingsResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().email.marketingSettings`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  get(options?: ReadOptions): Promise<CossResult<MarketingSettings>> {
    return this.#http.request({
      method: "GET",
      path: "/v1/marketing_settings",
      signal: options?.signal,
    });
  }

  /** Changes the fields given (`null` clears one). */
  update(
    params: UpdateMarketingSettingsParams,
    options?: ReadOptions,
  ): Promise<CossResult<MarketingSettings>> {
    return this.#http.request({
      method: "PATCH",
      path: "/v1/marketing_settings",
      body: params,
      signal: options?.signal,
    });
  }
}
