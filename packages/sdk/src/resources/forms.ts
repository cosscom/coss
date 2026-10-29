import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type { List } from "../types/email.ts";
import type {
  CreateFormParams,
  DeletedForm,
  DeletedFormSubmission,
  Form,
  FormSubmission,
  ListFormSubmissionsParams,
  ListFormsParams,
  UpdateFormParams,
} from "../types/forms.ts";
import { listQuery } from "./list-query.ts";

type ReadOptions = Pick<RequestOptions, "signal">;

function submissionPath(formId: string, id: string): string {
  return `/v1/forms/${encodeURIComponent(formId)}/submissions/${encodeURIComponent(id)}`;
}

/** `coss.forms.submissions`: what people submitted to a form. */
export class FormSubmissionsResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().forms.submissions`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /**
   * Lists a form's submissions, newest first (`status: ["held", "spam"]` for what Risk flagged).
   * Pass the last `id` as `after` while `has_more` is true.
   */
  list(
    formId: string,
    params: ListFormSubmissionsParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<List<FormSubmission>>> {
    return this.#http.request<List<FormSubmission>>({
      method: "GET",
      path: `/v1/forms/${encodeURIComponent(formId)}/submissions`,
      query: listQuery(params),
      signal: options?.signal,
    });
  }

  /** Retrieves one submission. */
  get(formId: string, id: string, options?: ReadOptions): Promise<CossResult<FormSubmission>> {
    return this.#http.request<FormSubmission>({
      method: "GET",
      path: submissionPath(formId, id),
      signal: options?.signal,
    });
  }

  /** Deletes a submission and its files. */
  remove(
    formId: string,
    id: string,
    options?: ReadOptions,
  ): Promise<CossResult<DeletedFormSubmission>> {
    return this.#http.request<DeletedFormSubmission>({
      method: "DELETE",
      path: submissionPath(formId, id),
      signal: options?.signal,
    });
  }

  /**
   * Not spam: a `held` or `spam` submission is accepted and delivered, and Risk records its
   * assessment as legitimate.
   */
  release(formId: string, id: string, options?: ReadOptions): Promise<CossResult<FormSubmission>> {
    return this.#http.request<FormSubmission>({
      method: "POST",
      path: `${submissionPath(formId, id)}/release`,
      signal: options?.signal,
    });
  }

  /** A file uploaded with the submission (`files[].id`). Treat its bytes as untrusted. */
  file(
    formId: string,
    id: string,
    fileId: string,
    options?: ReadOptions,
  ): Promise<CossResult<Uint8Array>> {
    return this.#http.request<Uint8Array>({
      method: "GET",
      path: `${submissionPath(formId, id)}/files/${encodeURIComponent(fileId)}`,
      responseType: "bytes",
      signal: options?.signal,
    });
  }
}

/** `coss.forms`: hosted form endpoints, screened by Risk. */
export class FormsResource {
  readonly #http: HttpClient;
  readonly submissions: FormSubmissionsResource;

  /** @internal Use `new Coss().forms`. */
  constructor(http: HttpClient) {
    this.#http = http;
    this.submissions = new FormSubmissionsResource(http);
  }

  /**
   * Creates a form: point an HTML `<form action>` (or `coss/forms`) at its `endpoint`. Not retried
   * automatically: a retry would create a second form.
   */
  create(params: CreateFormParams, options?: ReadOptions): Promise<CossResult<Form>> {
    return this.#http.request<Form>({
      method: "POST",
      path: "/v1/forms",
      body: params,
      retry: false,
      signal: options?.signal,
    });
  }

  /** Lists forms, newest first. Pass the last `id` as `after` while `has_more` is true. */
  list(params: ListFormsParams = {}, options?: ReadOptions): Promise<CossResult<List<Form>>> {
    return this.#http.request<List<Form>>({
      method: "GET",
      path: "/v1/forms",
      query: listQuery(params),
      signal: options?.signal,
    });
  }

  /** Retrieves one form. */
  get(id: string, options?: ReadOptions): Promise<CossResult<Form>> {
    return this.#http.request<Form>({
      method: "GET",
      path: `/v1/forms/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
  }

  /** Changes what is given, within each group (`spam`, `contacts`, …) too. */
  update(id: string, params: UpdateFormParams, options?: ReadOptions): Promise<CossResult<Form>> {
    return this.#http.request<Form>({
      method: "PATCH",
      path: `/v1/forms/${encodeURIComponent(id)}`,
      body: params,
      signal: options?.signal,
    });
  }

  /** Deletes the form with its submissions and files. */
  remove(id: string, options?: ReadOptions): Promise<CossResult<DeletedForm>> {
    return this.#http.request<DeletedForm>({
      method: "DELETE",
      path: `/v1/forms/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
  }
}
