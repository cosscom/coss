import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type { List } from "../types/email.ts";
import type {
  CreateEmailTemplateParams,
  DeletedEmailTemplate,
  EmailTemplate,
  EmailTemplateVersion,
  ListEmailTemplatesParams,
  ListEmailTemplateVersionsParams,
  PublishEmailTemplateParams,
  UpdateEmailTemplateDraftParams,
  UpdateEmailTemplateParams,
} from "../types/email-template.ts";
import { listQuery } from "./list-query.ts";

type ReadOptions = Pick<RequestOptions, "signal">;

const templatePath = (template: string) => `/v1/email_templates/${encodeURIComponent(template)}`;

/** `coss.email.templates.versions`: a template's published versions. */
export class EmailTemplateVersionsResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().email.templates.versions`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** Published versions, newest first. */
  list(
    template: string,
    params: ListEmailTemplateVersionsParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<List<EmailTemplateVersion>>> {
    return this.#http.request<List<EmailTemplateVersion>>({
      method: "GET",
      path: `${templatePath(template)}/versions`,
      query: listQuery(params),
      signal: options?.signal,
    });
  }

  get(
    template: string,
    version: number,
    options?: ReadOptions,
  ): Promise<CossResult<EmailTemplateVersion>> {
    return this.#http.request<EmailTemplateVersion>({
      method: "GET",
      path: `${templatePath(template)}/versions/${version}`,
      signal: options?.signal,
    });
  }

  /** Replaces the draft with this version's content; publish the draft to send it again. */
  restore(
    template: string,
    version: number,
    options?: ReadOptions,
  ): Promise<CossResult<EmailTemplateVersion>> {
    return this.#http.request<EmailTemplateVersion>({
      method: "POST",
      path: `${templatePath(template)}/versions/${version}/restore`,
      signal: options?.signal,
    });
  }
}

/**
 * `coss.email.templates`: the environment's email templates. Templates are addressed by id or
 * alias. Edit the draft, publish it, then send with `coss.email.send({ template_id, variables })`.
 */
export class EmailTemplatesResource {
  readonly #http: HttpClient;
  /** Published versions. */
  readonly versions: EmailTemplateVersionsResource;

  /** @internal Use `new Coss().email.templates`. */
  constructor(http: HttpClient) {
    this.#http = http;
    this.versions = new EmailTemplateVersionsResource(http);
  }

  /**
   * Creates a template and its draft. Never automatically retried: the API doesn't deduplicate it
   * (a template with an `alias` can't be created twice, though).
   */
  create(
    params: CreateEmailTemplateParams,
    options?: RequestOptions,
  ): Promise<CossResult<EmailTemplate>> {
    return this.#http.request<EmailTemplate>({
      method: "POST",
      path: "/v1/email_templates",
      retry: false,
      body: params,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  /** The environment's templates, newest first. */
  list(
    params: ListEmailTemplatesParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<List<EmailTemplate>>> {
    return this.#http.request<List<EmailTemplate>>({
      method: "GET",
      path: "/v1/email_templates",
      query: listQuery(params),
      signal: options?.signal,
    });
  }

  get(template: string, options?: ReadOptions): Promise<CossResult<EmailTemplate>> {
    return this.#http.request<EmailTemplate>({
      method: "GET",
      path: templatePath(template),
      signal: options?.signal,
    });
  }

  /** Changes its name, alias or description. */
  update(
    template: string,
    params: UpdateEmailTemplateParams,
    options?: ReadOptions,
  ): Promise<CossResult<EmailTemplate>> {
    return this.#http.request<EmailTemplate>({
      method: "PATCH",
      path: templatePath(template),
      body: params,
      signal: options?.signal,
    });
  }

  /** Deletes it with every version. Emails already sent keep their content. */
  delete(template: string, options?: ReadOptions): Promise<CossResult<DeletedEmailTemplate>> {
    return this.#http.request<DeletedEmailTemplate>({
      method: "DELETE",
      path: templatePath(template),
      signal: options?.signal,
    });
  }

  /** The draft, with `problems` that keep it from being published. */
  getDraft(template: string, options?: ReadOptions): Promise<CossResult<EmailTemplateVersion>> {
    return this.#http.request<EmailTemplateVersion>({
      method: "GET",
      path: `${templatePath(template)}/draft`,
      signal: options?.signal,
    });
  }

  /** Replaces the whole draft. Sends keep using the published version until you publish. */
  updateDraft(
    template: string,
    params: UpdateEmailTemplateDraftParams,
    options?: ReadOptions,
  ): Promise<CossResult<EmailTemplateVersion>> {
    return this.#http.request<EmailTemplateVersion>({
      method: "PUT",
      path: `${templatePath(template)}/draft`,
      body: params,
      signal: options?.signal,
    });
  }

  /**
   * Publishes the draft as the next version, which sends use from then on. Safe to retry: a draft
   * without changes since the last publish returns that version.
   */
  publish(
    template: string,
    params: PublishEmailTemplateParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<EmailTemplateVersion>> {
    return this.#http.request<EmailTemplateVersion>({
      method: "POST",
      path: `${templatePath(template)}/publish`,
      body: params,
      signal: options?.signal,
    });
  }
}
