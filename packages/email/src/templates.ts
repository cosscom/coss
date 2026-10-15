/**
 * Email templates, per environment: a template has one draft (edited) and immutable published
 * versions; each version holds typed variables and a subject, HTML and text per locale. Sends render
 * the published version (or a pinned one) when the email is stored, so a later publish never
 * changes an email already accepted. The language itself is `template-language.ts`.
 */
import { db, type Executor, schema, type Transaction } from "@coss/db";
import { isId } from "@coss/db/id";
import { and, asc, count, desc, eq, isNotNull, isNull, lt, max, sql } from "drizzle-orm";
import { EmailError } from "./errors.ts";
import {
  type CreateEmailTemplateRequestOutput,
  EmailSubject,
  type EmailTemplateObjectOutput,
  type EmailTemplateVersionObjectOutput,
  type TemplateDraftValues,
  type UpdateEmailTemplateRequestOutput,
} from "./schemas.ts";
import {
  checkTemplateContents,
  pickTemplateLocale,
  renderTemplateContent,
  type TemplateContentProblem,
  TemplateRenderError,
  type TemplateVariable,
  validateTemplateVariables,
} from "./template-language.ts";

const { emailTemplate, emailTemplateVersion, emailTemplateContent, environment } = schema;

export const MAX_TEMPLATES_PER_ENVIRONMENT = 500;

export type TemplateEnvironment = { organizationId: string; environmentId: string };
export type EmailTemplateRow = typeof emailTemplate.$inferSelect;
export type TemplateVersionRow = typeof emailTemplateVersion.$inferSelect;
export type TemplateContentRow = typeof emailTemplateContent.$inferSelect;

/** A template with its draft's state. */
export type EmailTemplateRecord = EmailTemplateRow & { hasUnpublishedChanges: boolean };
/** A draft or published version with its content, ordered by locale. */
export type TemplateVersion = TemplateVersionRow & { contents: TemplateContentRow[] };

const ALIAS_CONSTRAINT = "email_template_environment_alias_unique";

export function toEmailTemplateObject(record: EmailTemplateRecord): EmailTemplateObjectOutput {
  return {
    object: "email_template",
    id: record.id,
    alias: record.alias,
    name: record.name,
    description: record.description,
    published_version: record.publishedVersion,
    published_at: record.publishedAt?.toISOString() ?? null,
    has_unpublished_changes: record.hasUnpublishedChanges,
    created_at: record.createdAt.toISOString(),
    updated_at: record.updatedAt.toISOString(),
  };
}

/** Problems that keep a version from being published (always none for published ones). */
export function templateVersionProblems(version: TemplateVersion): TemplateContentProblem[] {
  return checkTemplateContents(version.contents, version.variables as TemplateVariable[]);
}

export function toEmailTemplateVersionObject(
  version: TemplateVersion,
): EmailTemplateVersionObjectOutput {
  return {
    object: "email_template_version",
    template_id: version.templateId,
    version: version.version,
    revision: version.revision,
    default_locale: version.defaultLocale,
    variables: version.variables,
    sample_variables: version.sampleVariables,
    contents: version.contents.map((content) => ({
      locale: content.locale,
      subject: content.subject,
      html: content.html,
      text: content.text,
    })),
    problems: version.version === null ? templateVersionProblems(version) : [],
    published_at: version.publishedAt?.toISOString() ?? null,
    created_at: version.createdAt.toISOString(),
    updated_at: version.updatedAt.toISOString(),
  };
}

function inEnvironment(env: TemplateEnvironment) {
  return and(
    eq(emailTemplate.organizationId, env.organizationId),
    eq(emailTemplate.environmentId, env.environmentId),
  );
}

/** Templates are addressed by id or alias (aliases never look like ids). */
function byReference(ref: string) {
  return isId("etpl", ref) ? eq(emailTemplate.id, ref) : eq(emailTemplate.alias, ref);
}

const draftJoin = and(
  eq(emailTemplateVersion.templateId, emailTemplate.id),
  eq(emailTemplateVersion.organizationId, emailTemplate.organizationId),
  isNull(emailTemplateVersion.version),
);

function isUniqueViolation(error: unknown, constraint: string): boolean {
  const cause = (error as { cause?: unknown })?.cause ?? error;
  const pg = cause as { code?: string; constraint?: string };
  return pg?.code === "23505" && pg.constraint === constraint;
}

function aliasTaken(alias: string): EmailError {
  return new EmailError(
    "template_alias_taken",
    `Another template in this environment has the alias "${alias}".`,
    { param: "alias" },
  );
}

/** A template of the environment by id or alias, with its draft's state; `null` if none. */
export async function getEmailTemplate(
  env: TemplateEnvironment,
  ref: string,
  executor: Executor = db,
): Promise<EmailTemplateRecord | null> {
  const [row] = await executor
    .select({
      template: emailTemplate,
      hasUnpublishedChanges: emailTemplateVersion.hasUnpublishedChanges,
    })
    .from(emailTemplate)
    .innerJoin(emailTemplateVersion, draftJoin)
    .where(and(inEnvironment(env), byReference(ref)))
    .limit(1);
  return row ? { ...row.template, hasUnpublishedChanges: row.hasUnpublishedChanges } : null;
}

export async function requireEmailTemplate(
  env: TemplateEnvironment,
  ref: string,
  executor: Executor = db,
): Promise<EmailTemplateRecord> {
  const record = await getEmailTemplate(env, ref, executor);
  if (!record) throw new EmailError("not_found", "Email template not found.");
  return record;
}

/** Locks the template row for a draft or publish change; throws `not_found`. */
async function lockTemplate(
  tx: Transaction,
  env: TemplateEnvironment,
  ref: string,
): Promise<EmailTemplateRow> {
  const [row] = await tx
    .select()
    .from(emailTemplate)
    .where(and(inEnvironment(env), byReference(ref)))
    .for("update")
    .limit(1);
  if (!row) throw new EmailError("not_found", "Email template not found.");
  return row;
}

/** The environment's templates, newest first. */
export async function pageEmailTemplates(
  env: TemplateEnvironment,
  page: { limit: number; after?: string | undefined },
): Promise<{ templates: EmailTemplateRecord[]; hasMore: boolean }> {
  if (page.after !== undefined && !isId("etpl", page.after)) {
    return { templates: [], hasMore: false };
  }
  // Keyset on (created_at, sequence), compared in SQL: a JS Date would drop the microseconds.
  const afterCursor =
    page.after === undefined
      ? undefined
      : sql`(${emailTemplate.createdAt}, ${emailTemplate.sequence}) < (select created_at, sequence from email_template where id = ${page.after} and organization_id = ${env.organizationId})`;
  const rows = await db
    .select({
      template: emailTemplate,
      hasUnpublishedChanges: emailTemplateVersion.hasUnpublishedChanges,
    })
    .from(emailTemplate)
    .innerJoin(emailTemplateVersion, draftJoin)
    .where(and(inEnvironment(env), afterCursor))
    .orderBy(desc(emailTemplate.createdAt), desc(emailTemplate.sequence))
    .limit(page.limit + 1);
  return {
    templates: rows
      .slice(0, page.limit)
      .map((row) => ({ ...row.template, hasUnpublishedChanges: row.hasUnpublishedChanges })),
    hasMore: rows.length > page.limit,
  };
}

async function insertContents(
  tx: Transaction,
  organizationId: string,
  versionId: string,
  contents: readonly {
    locale: string;
    subject: string;
    html: string | null;
    text: string | null;
  }[],
): Promise<void> {
  if (contents.length === 0) return;
  await tx.insert(emailTemplateContent).values(
    contents.map((content) => ({
      organizationId,
      versionId,
      locale: content.locale,
      subject: content.subject,
      html: content.html,
      text: content.text,
    })),
  );
}

/** Creates a template and its draft. */
export async function createEmailTemplate(
  env: TemplateEnvironment,
  params: CreateEmailTemplateRequestOutput,
): Promise<EmailTemplateRecord> {
  try {
    return await db.transaction(async (tx) => {
      const [found] = await tx
        .select({ projectId: environment.projectId })
        .from(environment)
        .where(
          and(
            eq(environment.id, env.environmentId),
            eq(environment.organizationId, env.organizationId),
          ),
        )
        // Serializes creates, so the limit holds under concurrency.
        .for("update")
        .limit(1);
      if (!found) throw new EmailError("not_found", "Environment not found.");
      const [existing] = await tx
        .select({ total: count() })
        .from(emailTemplate)
        .where(inEnvironment(env));
      if ((existing?.total ?? 0) >= MAX_TEMPLATES_PER_ENVIRONMENT) {
        throw new EmailError(
          "template_limit_reached",
          `An environment can have at most ${MAX_TEMPLATES_PER_ENVIRONMENT} email templates.`,
        );
      }
      const [template] = await tx
        .insert(emailTemplate)
        .values({
          ...env,
          projectId: found.projectId,
          name: params.name,
          alias: params.alias,
          description: params.description,
        })
        .returning();
      if (!template) throw new Error("Email template insert returned no row.");
      const [draft] = await tx
        .insert(emailTemplateVersion)
        .values({
          organizationId: env.organizationId,
          templateId: template.id,
          defaultLocale: params.draft.default_locale,
          variables: params.draft.variables,
          sampleVariables: params.draft.sample_variables,
        })
        .returning({ id: emailTemplateVersion.id });
      if (!draft) throw new Error("Email template draft insert returned no row.");
      await insertContents(tx, env.organizationId, draft.id, params.draft.contents);
      return { ...template, hasUnpublishedChanges: true };
    });
  } catch (error) {
    if (params.alias && isUniqueViolation(error, ALIAS_CONSTRAINT)) throw aliasTaken(params.alias);
    throw error;
  }
}

export async function updateEmailTemplate(
  env: TemplateEnvironment,
  ref: string,
  params: UpdateEmailTemplateRequestOutput,
): Promise<EmailTemplateRecord> {
  let updated: EmailTemplateRow | undefined;
  try {
    [updated] = await db
      .update(emailTemplate)
      .set({
        ...(params.name === undefined ? {} : { name: params.name }),
        ...(params.alias === undefined ? {} : { alias: params.alias }),
        ...(params.description === undefined ? {} : { description: params.description || null }),
        updatedAt: new Date(),
      })
      .where(and(inEnvironment(env), byReference(ref)))
      .returning();
  } catch (error) {
    if (params.alias && isUniqueViolation(error, ALIAS_CONSTRAINT)) throw aliasTaken(params.alias);
    throw error;
  }
  if (!updated) throw new EmailError("not_found", "Email template not found.");
  return requireEmailTemplate(env, updated.id);
}

/** Deletes a template and every version. Emails already sent from it keep their content. */
export async function deleteEmailTemplate(
  env: TemplateEnvironment,
  ref: string,
): Promise<{ id: string }> {
  const [deleted] = await db
    .delete(emailTemplate)
    .where(and(inEnvironment(env), byReference(ref)))
    .returning({ id: emailTemplate.id });
  if (!deleted) throw new EmailError("not_found", "Email template not found.");
  return deleted;
}

async function withContents(
  executor: Executor,
  version: TemplateVersionRow,
): Promise<TemplateVersion> {
  const contents = await executor
    .select()
    .from(emailTemplateContent)
    .where(
      and(
        eq(emailTemplateContent.organizationId, version.organizationId),
        eq(emailTemplateContent.versionId, version.id),
      ),
    )
    .orderBy(asc(emailTemplateContent.locale));
  return { ...version, contents };
}

/** The template's draft (`version` NULL) or one published version, without content. */
async function selectVersion(
  executor: Executor,
  template: Pick<EmailTemplateRow, "id" | "organizationId">,
  version: number | null,
  opts: { lock?: boolean } = {},
): Promise<TemplateVersionRow | undefined> {
  const query = executor
    .select()
    .from(emailTemplateVersion)
    .where(
      and(
        eq(emailTemplateVersion.organizationId, template.organizationId),
        eq(emailTemplateVersion.templateId, template.id),
        version === null
          ? isNull(emailTemplateVersion.version)
          : eq(emailTemplateVersion.version, version),
      ),
    )
    .limit(1);
  const [row] = await (opts.lock ? query.for("update") : query);
  return row;
}

async function requireDraft(
  executor: Executor,
  template: EmailTemplateRow,
  opts: { lock?: boolean } = {},
): Promise<TemplateVersionRow> {
  const draft = await selectVersion(executor, template, null, opts);
  // Created with its template and never deleted on its own.
  if (!draft) throw new Error(`Email template ${template.id} has no draft.`);
  return draft;
}

/**
 * The draft with its contents, read from one snapshot: a save replaces both, and reading them
 * apart could pair new contents with the variables (or revision) of the save before.
 */
function readDraft(template: EmailTemplateRow): Promise<TemplateVersion> {
  return db.transaction(async (tx) => withContents(tx, await requireDraft(tx, template)), {
    isolationLevel: "repeatable read",
    accessMode: "read only",
  });
}

export async function getTemplateDraft(
  env: TemplateEnvironment,
  ref: string,
): Promise<{ template: EmailTemplateRecord; draft: TemplateVersion }> {
  const template = await requireEmailTemplate(env, ref);
  return { template, draft: await readDraft(template) };
}

/** A published version; `template_version_not_found`-free: `null` when it doesn't exist. */
export async function getTemplateVersion(
  env: TemplateEnvironment,
  ref: string,
  version: number,
): Promise<{ template: EmailTemplateRecord; version: TemplateVersion | null }> {
  const template = await requireEmailTemplate(env, ref);
  const row = await selectVersion(db, template, version);
  return { template, version: row ? await withContents(db, row) : null };
}

/** Published versions, newest first. */
export async function pageTemplateVersions(
  env: TemplateEnvironment,
  ref: string,
  page: { limit: number; after?: number | undefined },
): Promise<{ template: EmailTemplateRecord; versions: TemplateVersion[]; hasMore: boolean }> {
  const template = await requireEmailTemplate(env, ref);
  const rows = await db
    .select()
    .from(emailTemplateVersion)
    .where(
      and(
        eq(emailTemplateVersion.organizationId, template.organizationId),
        eq(emailTemplateVersion.templateId, template.id),
        isNotNull(emailTemplateVersion.version),
        page.after === undefined ? undefined : lt(emailTemplateVersion.version, page.after),
      ),
    )
    .orderBy(desc(emailTemplateVersion.version))
    .limit(page.limit + 1);
  const versions = await Promise.all(rows.slice(0, page.limit).map((row) => withContents(db, row)));
  return { template, versions, hasMore: rows.length > page.limit };
}

function checkRevision(draft: TemplateVersionRow, revision: number | undefined): void {
  if (revision !== undefined && revision !== draft.revision) {
    throw new EmailError(
      "template_revision_mismatch",
      `The draft changed since revision ${revision} (it is at revision ${draft.revision}). ` +
        "Read it again before changing or publishing it.",
      { param: "revision" },
    );
  }
}

async function replaceDraft(
  tx: Transaction,
  template: EmailTemplateRow,
  draft: TemplateVersionRow,
  values: TemplateDraftValues,
  hasUnpublishedChanges: boolean,
): Promise<TemplateVersion> {
  const now = new Date();
  const [updated] = await tx
    .update(emailTemplateVersion)
    .set({
      defaultLocale: values.default_locale,
      variables: values.variables,
      sampleVariables: values.sample_variables,
      revision: draft.revision + 1,
      hasUnpublishedChanges,
      updatedAt: now,
    })
    .where(
      and(
        eq(emailTemplateVersion.organizationId, draft.organizationId),
        eq(emailTemplateVersion.id, draft.id),
      ),
    )
    .returning();
  if (!updated) throw new Error("Email template draft update returned no row.");
  await tx
    .delete(emailTemplateContent)
    .where(
      and(
        eq(emailTemplateContent.organizationId, draft.organizationId),
        eq(emailTemplateContent.versionId, draft.id),
      ),
    );
  await insertContents(tx, draft.organizationId, draft.id, values.contents);
  await tx
    .update(emailTemplate)
    .set({ updatedAt: now })
    .where(
      and(
        eq(emailTemplate.organizationId, template.organizationId),
        eq(emailTemplate.id, template.id),
      ),
    );
  return withContents(tx, updated);
}

/** Replaces the draft. Problems in it are kept (and reported) until it is published. */
export async function saveTemplateDraft(
  env: TemplateEnvironment,
  ref: string,
  params: TemplateDraftValues & { revision?: number | undefined },
): Promise<{ template: EmailTemplateRecord; draft: TemplateVersion }> {
  return db.transaction(async (tx) => {
    const template = await lockTemplate(tx, env, ref);
    const draft = await requireDraft(tx, template, { lock: true });
    checkRevision(draft, params.revision);
    const saved = await replaceDraft(tx, template, draft, params, true);
    return {
      template: { ...template, updatedAt: saved.updatedAt, hasUnpublishedChanges: true },
      draft: saved,
    };
  });
}

/** Problems as a template_invalid error (first one in the message, all as issues). */
function invalidTemplate(problems: TemplateContentProblem[]): EmailError {
  const issues = problems.map((problem) => ({
    path: `contents.${problem.locale}.${problem.field}`,
    message: `Line ${problem.line}, column ${problem.column}: ${problem.message}`,
  }));
  const [first] = issues;
  return new EmailError(
    "template_invalid",
    first ? `${first.path}: ${first.message}` : "The template is invalid.",
    { issues },
  );
}

function draftProblems(draft: TemplateVersion): EmailError | null {
  if (draft.contents.length === 0) {
    return new EmailError("template_invalid", "The draft has no content: add at least one locale.");
  }
  if (!draft.contents.some((content) => content.locale === draft.defaultLocale)) {
    return new EmailError(
      "template_invalid",
      `The draft has no content for its default locale "${draft.defaultLocale}".`,
    );
  }
  const problems = templateVersionProblems(draft);
  return problems.length > 0 ? invalidTemplate(problems) : null;
}

/**
 * Publishes the draft as the next version, which sends then use. A draft without changes since
 * the last publish returns that version, so retries never publish twice.
 */
export async function publishTemplateDraft(
  env: TemplateEnvironment,
  ref: string,
  params: { revision?: number | undefined } = {},
  now: Date = new Date(),
): Promise<{ template: EmailTemplateRecord; version: TemplateVersion; published: boolean }> {
  return db.transaction(async (tx) => {
    const template = await lockTemplate(tx, env, ref);
    const draftRow = await requireDraft(tx, template, { lock: true });
    checkRevision(draftRow, params.revision);
    if (!draftRow.hasUnpublishedChanges && template.publishedVersion !== null) {
      const current = await selectVersion(tx, template, template.publishedVersion);
      if (!current) throw new Error(`Email template ${template.id} lost its published version.`);
      return {
        template: { ...template, hasUnpublishedChanges: false },
        version: await withContents(tx, current),
        published: false,
      };
    }
    const draft = await withContents(tx, draftRow);
    const problem = draftProblems(draft);
    if (problem) throw problem;
    const [latest] = await tx
      .select({ version: max(emailTemplateVersion.version) })
      .from(emailTemplateVersion)
      .where(
        and(
          eq(emailTemplateVersion.organizationId, template.organizationId),
          eq(emailTemplateVersion.templateId, template.id),
        ),
      );
    const next = (latest?.version ?? 0) + 1;
    const [version] = await tx
      .insert(emailTemplateVersion)
      .values({
        organizationId: template.organizationId,
        templateId: template.id,
        version: next,
        defaultLocale: draft.defaultLocale,
        variables: draft.variables,
        sampleVariables: draft.sampleVariables,
        revision: draft.revision,
        hasUnpublishedChanges: false,
        publishedAt: now,
      })
      .returning();
    if (!version) throw new Error("Email template version insert returned no row.");
    await insertContents(tx, template.organizationId, version.id, draft.contents);
    await tx
      .update(emailTemplateVersion)
      .set({ hasUnpublishedChanges: false })
      .where(
        and(
          eq(emailTemplateVersion.organizationId, draft.organizationId),
          eq(emailTemplateVersion.id, draft.id),
        ),
      );
    const [updated] = await tx
      .update(emailTemplate)
      .set({ publishedVersion: next, publishedAt: now, updatedAt: now })
      .where(
        and(
          eq(emailTemplate.organizationId, template.organizationId),
          eq(emailTemplate.id, template.id),
        ),
      )
      .returning();
    if (!updated) throw new Error("Email template update returned no row.");
    return {
      template: { ...updated, hasUnpublishedChanges: false },
      version: await withContents(tx, version),
      published: true,
    };
  });
}

/** Copies a published version into the draft (publish it to send it again). */
export async function restoreTemplateVersion(
  env: TemplateEnvironment,
  ref: string,
  version: number,
): Promise<{ template: EmailTemplateRecord; draft: TemplateVersion }> {
  return db.transaction(async (tx) => {
    const template = await lockTemplate(tx, env, ref);
    const row = await selectVersion(tx, template, version);
    if (!row) {
      throw new EmailError(
        "template_version_not_found",
        `The template has no version ${version}.`,
        {
          param: "version",
        },
      );
    }
    const source = await withContents(tx, row);
    const draft = await requireDraft(tx, template, { lock: true });
    // Restoring the version sends already use leaves nothing to publish.
    const hasUnpublishedChanges = version !== template.publishedVersion;
    const saved = await replaceDraft(
      tx,
      template,
      draft,
      {
        default_locale: source.defaultLocale,
        variables: source.variables as TemplateDraftValues["variables"],
        sample_variables: source.sampleVariables,
        contents: source.contents,
      },
      hasUnpublishedChanges,
    );
    return {
      template: { ...template, updatedAt: saved.updatedAt, hasUnpublishedChanges },
      draft: saved,
    };
  });
}

/** What a send asks of a template (from `SendEmailRequest`). */
export type TemplateSendRequest = {
  templateId: string;
  version?: number | undefined;
  locale?: string | undefined;
  variables: Record<string, unknown>;
  /** Internal only (the dashboard's test sends): render the draft. */
  draft?: boolean;
};

export type RenderedTemplateSend = {
  subject: string;
  html: string | null;
  text: string | null;
  template: { id: string; version: number | null; locale: string };
};

/** Versions loaded by one request, keyed by template reference and version. */
export type TemplateVersionCache = Map<
  string,
  Promise<TemplateVersion & { template: EmailTemplateRow }>
>;

async function loadForSend(
  env: TemplateEnvironment,
  request: TemplateSendRequest,
  param: (field: string) => string,
): Promise<TemplateVersion & { template: EmailTemplateRow }> {
  const record = await getEmailTemplate(env, request.templateId);
  if (!record) {
    throw new EmailError(
      "template_not_found",
      `No email template "${request.templateId}" exists in this environment.`,
      { param: param("template_id") },
    );
  }
  const template = record;
  // Published versions never change; only the draft needs a consistent read.
  if (request.draft) return { ...(await readDraft(template)), template };
  let row: TemplateVersionRow | undefined;
  if (request.version !== undefined) {
    row = await selectVersion(db, template, request.version);
    if (!row) {
      throw new EmailError(
        "template_version_not_found",
        `The template has no version ${request.version}.`,
        { param: param("template_version") },
      );
    }
  } else {
    if (template.publishedVersion === null) {
      throw new EmailError(
        "template_not_published",
        "The template has no published version yet: publish its draft first.",
        { param: param("template_id") },
      );
    }
    row = await selectVersion(db, template, template.publishedVersion);
    if (!row) throw new Error(`Email template ${template.id} lost its published version.`);
  }
  return { ...(await withContents(db, row)), template };
}

/**
 * Renders a send's template: loads the version (cached per request), picks the locale, checks the
 * variables and renders. Errors name the send's fields (`emails.3.variables.name` in a batch).
 */
export async function renderTemplateForSend(
  env: TemplateEnvironment,
  request: TemplateSendRequest,
  opts: { cache?: TemplateVersionCache; paramPrefix?: string } = {},
): Promise<RenderedTemplateSend> {
  const param = (field: string) => `${opts.paramPrefix ?? ""}${field}`;
  const key = JSON.stringify([
    request.templateId,
    request.draft ? "draft" : (request.version ?? "latest"),
  ]);
  let loading = opts.cache?.get(key);
  if (!loading) {
    loading = loadForSend(env, request, param);
    opts.cache?.set(key, loading);
    // A failed load is not cached: its error names the first email's fields.
    loading.catch(() => opts.cache?.delete(key));
  }
  const version = await loading;

  if (request.draft) {
    const problem = draftProblems(version);
    if (problem) throw problem;
  }
  const locale = pickTemplateLocale(
    version.contents.map((content) => content.locale),
    request.locale,
    version.defaultLocale,
  );
  const content = version.contents.find((candidate) => candidate.locale === locale);
  if (!content) throw new Error(`Email template ${version.templateId} has no "${locale}" content.`);

  const variables = version.variables as TemplateVariable[];
  const validated = validateTemplateVariables(variables, request.variables);
  if (!validated.ok) {
    const issues = validated.issues.map((issue) => ({
      path: param(["variables", ...issue.path].join(".")),
      message: issue.message,
    }));
    const [first] = issues;
    throw new EmailError(
      "invalid_template_variables",
      `${first?.path}: ${first?.message}${issues.length > 1 ? ` (and ${issues.length - 1} more)` : ""}`,
      { param: first?.path ?? param("variables"), issues },
    );
  }

  let rendered: ReturnType<typeof renderTemplateContent>;
  try {
    rendered = renderTemplateContent(content, validated.values, variables);
  } catch (error) {
    if (error instanceof TemplateRenderError) {
      throw new EmailError("template_render_failed", error.message, {
        param: param("variables"),
      });
    }
    throw error;
  }
  const subject = EmailSubject.safeParse(rendered.subject);
  if (!subject.success) {
    throw new EmailError(
      "template_render_failed",
      `The rendered subject is invalid: ${subject.error.issues[0]?.message ?? "invalid subject"}`,
      { param: param("variables") },
    );
  }
  if (!rendered.html && !rendered.text) {
    throw new EmailError("template_render_failed", "The template renders an empty body.", {
      param: param("variables"),
    });
  }
  return {
    subject: subject.data,
    html: rendered.html || null,
    text: rendered.text || null,
    template: {
      id: version.templateId,
      version: request.draft ? null : version.version,
      locale,
    },
  };
}
