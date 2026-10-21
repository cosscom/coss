import type {
  MobileTemplate,
  MobileTemplateSummary,
  MobileTemplateVariable,
  TemplatePreviewContent,
  TemplateProblem,
  TemplateRendering,
  TemplateResponse,
  TemplateVersionResponse,
  TemplateVersionSummary,
} from "@coss/companion";
import {
  EmailError,
  type EmailTemplateRecord,
  type TemplateVersion,
  templateVersionProblems,
} from "@coss/email";
import {
  parseTemplate,
  renderableValues,
  renderTemplate,
  type TemplateField,
  TemplateRenderError,
  type TemplateValues,
  type TemplateVariable,
  validateTemplateVariables,
} from "@coss/email/templates";
import { MobileApiError } from "@/lib/mobile-api";

/** `getTemplateDraft` & co. throw `not_found` for another environment's template (or none). */
export function templateNotFound(error: unknown): never {
  if (error instanceof EmailError && error.code === "not_found") {
    throw new MobileApiError(404, "not_found", "Template not found.");
  }
  throw error;
}

export function toMobileTemplateSummary(record: EmailTemplateRecord): MobileTemplateSummary {
  return {
    id: record.id,
    name: record.name,
    alias: record.alias,
    published_version: record.publishedVersion,
    has_unpublished_changes: record.hasUnpublishedChanges,
    updated_at: record.updatedAt.toISOString(),
  };
}

export function toMobileTemplate(record: EmailTemplateRecord): MobileTemplate {
  return { ...toMobileTemplateSummary(record), description: record.description };
}

export function toTemplateRef(record: EmailTemplateRecord): TemplateVersionResponse["template"] {
  return { id: record.id, name: record.name, published_version: record.publishedVersion };
}

function toMobileVariable(variable: TemplateVariable): MobileTemplateVariable {
  return {
    name: variable.name,
    type: variable.type,
    required: variable.required,
    default: variable.default ?? null,
    description: variable.description ?? null,
    fields: variable.fields ?? [],
  };
}

// The dashboard's TemplatePreview (templates/template-preview.tsx), rendered here with the same
// code that renders sends (`@coss/email/templates`), so the app never gets the HTML.
function renderField(
  field: TemplateField,
  source: string,
  values: TemplateValues,
  variables: readonly TemplateVariable[],
): TemplateRendering {
  const parsed = parseTemplate(source);
  if (!parsed.ok) {
    const { message, line, column } = parsed.problem;
    return { ok: false, message: `Line ${line}, column ${column}: ${message}` };
  }
  try {
    return { ok: true, value: renderTemplate(parsed.nodes, values, { field, variables }) };
  } catch (error) {
    if (error instanceof TemplateRenderError) return { ok: false, message: error.message };
    throw error;
  }
}

/** A version's variables, its sample values' issues and a renderer of its locales. */
function previewer(version: TemplateVersion) {
  const variables = version.variables as TemplateVariable[];
  const validated = validateTemplateVariables(variables, version.sampleVariables);
  // Still render what can be of the sample.
  const values = validated.ok ? validated.values : renderableValues(version.sampleVariables);
  return {
    variables: variables.map(toMobileVariable),
    sampleIssues: validated.ok
      ? []
      : validated.issues.slice(0, 5).map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    preview: (content: TemplateVersion["contents"][number]): TemplatePreviewContent => ({
      locale: content.locale,
      subject: renderField("subject", content.subject, values, variables),
      text: content.text === null ? null : renderField("text", content.text, values, variables),
      has_html: content.html !== null,
    }),
  };
}

export function toTemplateDraft(draft: TemplateVersion): TemplateResponse["draft"] {
  const { variables, sampleIssues, preview } = previewer(draft);
  return {
    revision: draft.revision,
    default_locale: draft.defaultLocale,
    variables,
    sample_variables: draft.sampleVariables,
    sample_issues: sampleIssues,
    contents: draft.contents.map((content) => ({
      ...preview(content),
      subject_source: content.subject,
      text_source: content.text,
    })),
    problems: templateVersionProblems(draft).map(
      (problem): TemplateProblem => ({
        locale: problem.locale,
        field: problem.field,
        line: problem.line,
        column: problem.column,
        message: problem.message,
      }),
    ),
  };
}

/** Published versions always have a number and a publication time. */
function publishedAt(version: TemplateVersion): string {
  return (version.publishedAt ?? version.createdAt).toISOString();
}

export function toTemplateVersionSummary(version: TemplateVersion): TemplateVersionSummary {
  return {
    version: version.version ?? 0,
    locales: version.contents.map((content) => content.locale),
    variables: (version.variables as TemplateVariable[]).map((variable) => variable.name),
    published_at: publishedAt(version),
  };
}

export function toTemplateVersion(
  record: EmailTemplateRecord,
  version: TemplateVersion & { version: number },
): TemplateVersionResponse {
  const { variables, sampleIssues, preview } = previewer(version);
  return {
    template: toTemplateRef(record),
    version: {
      version: version.version,
      published_at: publishedAt(version),
      default_locale: version.defaultLocale,
      variables,
      sample_issues: sampleIssues,
      contents: version.contents.map(preview),
    },
  };
}
