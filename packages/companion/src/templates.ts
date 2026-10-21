// Email templates, their versions, and the environment's content storage.
// HTML bodies are never sent to the app: their previews stay on coss.com.

import type { Page } from "./index.ts";

export type TemplateVariableType = "string" | "number" | "boolean" | "list";

export type MobileTemplateVariable = {
  name: string;
  type: TemplateVariableType;
  required: boolean;
  /** `null`: no default. */
  default: string | number | boolean | null;
  description: string | null;
  /** A list's item fields (empty for other types). */
  fields: { name: string; type: Exclude<TemplateVariableType, "list">; required: boolean }[];
};

/** A field rendered with the sample values, or why it couldn't be. */
export type TemplateRendering = { ok: true; value: string } | { ok: false; message: string };

/** One locale, rendered with the sample values as a send would be (the dashboard's Preview). */
export type TemplatePreviewContent = {
  locale: string;
  subject: TemplateRendering;
  /** `null`: no text part. */
  text: TemplateRendering | null;
  has_html: boolean;
};

/** The draft's locale as written (`{{variables}}` unrendered), with its preview. */
export type TemplateDraftContent = TemplatePreviewContent & {
  subject_source: string;
  text_source: string | null;
};

export type TemplateProblem = {
  locale: string;
  field: "subject" | "html" | "text";
  line: number;
  column: number;
  message: string;
};

export type MobileTemplateSummary = {
  id: string;
  name: string;
  alias: string | null;
  published_version: number | null;
  has_unpublished_changes: boolean;
  updated_at: string;
};

export type TemplateListResponse = Page<MobileTemplateSummary>;

export type MobileTemplate = MobileTemplateSummary & { description: string | null };

export type TemplateResponse = {
  template: MobileTemplate;
  draft: {
    revision: number;
    default_locale: string;
    variables: MobileTemplateVariable[];
    /** JSON, as the dashboard's sample values. */
    sample_variables: Record<string, unknown>;
    /** Where the sample values don't match the variables (at most 5). */
    sample_issues: string[];
    contents: TemplateDraftContent[];
    /** What keeps the draft from being published. */
    problems: TemplateProblem[];
  };
};

export type TemplateVersionSummary = {
  version: number;
  locales: string[];
  variables: string[];
  published_at: string;
};

export type TemplateVersionsResponse = Page<TemplateVersionSummary> & {
  template: { id: string; name: string; published_version: number | null };
};

export type TemplateVersionResponse = {
  template: { id: string; name: string; published_version: number | null };
  version: {
    version: number;
    published_at: string;
    default_locale: string;
    variables: MobileTemplateVariable[];
    sample_issues: string[];
    contents: TemplatePreviewContent[];
  };
};

export type ContentStorageResponse = {
  content_storage: "store" | "discard";
  /** `null`: never changed, so content is stored. */
  updated_at: string | null;
};
