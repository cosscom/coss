/** Wire types of email templates (`coss.email.templates`). */

/** A variable's type. `list` is an array of objects with the declared `fields`. */
export type TemplateVariableType = "string" | "number" | "boolean" | "list";
export type TemplateScalarType = "string" | "number" | "boolean";

/** A declared variable, used in the template as `{{name}}`. */
export interface TemplateVariable {
  name: string;
  type: TemplateVariableType;
  /** Sends must pass it unless it has a `default`. */
  required: boolean;
  /** Used when a send leaves it out. */
  default?: string | number | boolean;
  description?: string;
  /** A list's item fields. */
  fields?: { name: string; type: TemplateScalarType; required: boolean }[];
}

/** A variable to declare. `required` defaults to true. */
export interface TemplateVariableParams {
  /** 1-64 letters, digits and underscores, not starting with a digit. */
  name: string;
  type: TemplateVariableType;
  required?: boolean;
  /** Not for lists. */
  default?: string | number | boolean;
  description?: string;
  /** Required for lists, only for lists. */
  fields?: { name: string; type: TemplateScalarType; required?: boolean }[];
}

/** One locale's subject, HTML and text templates. */
export interface TemplateContent {
  /** A BCP 47 language tag, e.g. `"en"` or `"pt-BR"`. */
  locale: string;
  subject: string;
  html: string | null;
  text: string | null;
}

/** One locale's templates. Provide `html`, `text`, or both. */
export interface TemplateContentParams {
  locale: string;
  subject: string;
  html?: string | null;
  text?: string | null;
}

/** A problem that keeps a draft from being published, at a line and column of one field. */
export interface TemplateProblem {
  locale: string;
  field: "subject" | "html" | "text";
  message: string;
  line: number;
  column: number;
}

export interface EmailTemplate {
  object: "email_template";
  id: string;
  /** Send it by this name in any environment that has a template with the same alias. */
  alias: string | null;
  name: string;
  description: string | null;
  /** The version sends use; `null` until the draft is first published. */
  published_version: number | null;
  /** ISO 8601 timestamp, or `null`. */
  published_at: string | null;
  /** Whether the draft was changed since it was last published. */
  has_unpublished_changes: boolean;
  created_at: string;
  updated_at: string;
}

/** A template's draft (`version: null`) or a published version (which never changes). */
export interface EmailTemplateVersion {
  object: "email_template_version";
  template_id: string;
  version: number | null;
  /** Counts the draft's saves; pass it back to refuse overwriting someone else's changes. */
  revision: number;
  /** The locale sends fall back to. */
  default_locale: string;
  variables: TemplateVariable[];
  /** Example values for previews and test sends. */
  sample_variables: Record<string, unknown>;
  contents: TemplateContent[];
  /** Problems of a draft; always empty for published versions. */
  problems: TemplateProblem[];
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface TemplateDraftParams {
  /** Defaults to the first entry of `contents` (or `"en"`). */
  default_locale?: string;
  variables?: TemplateVariableParams[];
  sample_variables?: Record<string, unknown>;
  contents?: TemplateContentParams[];
}

/** Parameters of `coss.email.templates.create`. */
export interface CreateEmailTemplateParams extends TemplateDraftParams {
  name: string;
  /** 1-64 lower-case letters, digits, `-` and `_`, e.g. `"welcome"`. */
  alias?: string;
  description?: string;
}

/** Parameters of `coss.email.templates.update`. */
export interface UpdateEmailTemplateParams {
  name?: string;
  /** `null` removes the alias. */
  alias?: string | null;
  description?: string | null;
}

/** Parameters of `coss.email.templates.updateDraft`: replaces the whole draft. */
export interface UpdateEmailTemplateDraftParams extends TemplateDraftParams {
  /** The `revision` you read: refused (`template_revision_mismatch`) if the draft changed since. */
  revision?: number;
}

/** Parameters of `coss.email.templates.publish`. */
export interface PublishEmailTemplateParams {
  /** The draft `revision` you reviewed: refused if the draft changed since. */
  revision?: number;
}

/** Parameters of `coss.email.templates.render`. */
export interface RenderEmailTemplateParams {
  /** A published version to render. Default: the draft. */
  version?: number;
  /** Falls back to the language (`"pt"`), then to the default locale, as sends do. */
  locale?: string;
  /** Checked as a send checks them. Default: the version's `sample_variables`. */
  variables?: Record<string, unknown>;
}

/** A rendered template (`coss.email.templates.render`): nothing was sent or stored. */
export interface RenderedEmailTemplate {
  object: "email_template_render";
  template_id: string;
  /** The version rendered; `null` for the draft. */
  version: number | null;
  /** The locale rendered. */
  locale: string;
  subject: string;
  html: string | null;
  text: string | null;
}

export interface ListEmailTemplatesParams {
  /** 1-100, default 50. */
  limit?: number;
  /** Cursor: the `id` of the last template of the previous page. */
  after?: string;
}

export interface ListEmailTemplateVersionsParams {
  /** 1-20, default 10. */
  limit?: number;
  /** Cursor: the `version` of the last version of the previous page. */
  after?: number;
}

export interface DeletedEmailTemplate {
  object: "email_template";
  id: string;
  deleted: true;
}

/** The template an email was rendered from. */
export interface EmailTemplateReference {
  id: string;
  /** `null` for a dashboard test send of the draft. */
  version: number | null;
  locale: string;
}
