/**
 * Templates: documents with fields for roles (`client`, `company`) instead of named signers,
 * edited over the API or in the embedded builder, and made into requests by naming one signer per
 * role (`createRequestFromTemplate`), with merge fields filled in. Anchored fields are resolved
 * when a template is saved, so its fields are always positions.
 */
import { db, schema, type Transaction } from "@coss/db";
import { ID_PREFIXES, isId } from "@coss/db/id";
import type { SignTemplateRole } from "@coss/db/schema";
import { and, asc, desc, eq, lt, or, type SQL } from "drizzle-orm";
import {
  environmentDocuments,
  type PreparedDocument,
  prepareDocument,
  type SignEnvironment,
} from "./documents.ts";
import { SignError } from "./errors.ts";
import type { SignActor } from "./events.ts";
import { checkFieldCount, type FieldDocument, placeSignerFields } from "./fields.ts";
import type { SignService } from "./requests.ts";
import {
  type CreateSignRequestFromTemplateRequestOutput,
  type CreateSignTemplateRequestOutput,
  DEFAULT_SIGN_LIST_LIMIT,
  MAX_SIGN_LIST_LIMIT,
  type SignFieldInputOutput,
  type SignRequestObjectOutput,
  type SignTemplateObjectOutput,
  type UpdateSignTemplateRequestOutput,
} from "./schemas.ts";
import type { DocumentStore } from "./store.ts";

const { environment, signDocument, signTemplate, signTemplateDocument, signTemplateField } = schema;

export type SignTemplateRow = typeof signTemplate.$inferSelect;
type TemplateFieldRow = typeof signTemplateField.$inferSelect;
type TemplateDocument = FieldDocument & { filename: string; sha256: string };

function notFound(): SignError {
  return new SignError("not_found", "No template with this id exists in this environment.");
}

type TemplateScope = { organizationId: string; environmentId: string; templateId: string };

function scope(input: TemplateScope) {
  return and(
    eq(signTemplate.id, input.templateId),
    eq(signTemplate.organizationId, input.organizationId),
    eq(signTemplate.environmentId, input.environmentId),
  );
}

async function templateDocuments(
  executor: typeof db | Transaction,
  template: Pick<SignTemplateRow, "id" | "organizationId">,
): Promise<TemplateDocument[]> {
  return executor
    .select({
      id: signDocument.id,
      filename: signDocument.filename,
      sha256: signDocument.sha256,
      pages: signDocument.pages,
      anchors: signDocument.anchors,
    })
    .from(signTemplateDocument)
    .innerJoin(
      signDocument,
      and(
        eq(signDocument.id, signTemplateDocument.documentId),
        eq(signDocument.organizationId, signTemplateDocument.organizationId),
      ),
    )
    .where(
      and(
        eq(signTemplateDocument.templateId, template.id),
        eq(signTemplateDocument.organizationId, template.organizationId),
      ),
    )
    .orderBy(asc(signTemplateDocument.position));
}

async function templateFields(
  executor: typeof db | Transaction,
  template: Pick<SignTemplateRow, "id" | "organizationId">,
): Promise<TemplateFieldRow[]> {
  return executor
    .select()
    .from(signTemplateField)
    .where(
      and(
        eq(signTemplateField.templateId, template.id),
        eq(signTemplateField.organizationId, template.organizationId),
      ),
    )
    .orderBy(
      asc(signTemplateField.document),
      asc(signTemplateField.page),
      asc(signTemplateField.y),
    );
}

/** Requests can be made from it: documents, roles, and a signature field for every role. */
function isReady(
  roles: readonly SignTemplateRole[],
  documents: readonly unknown[],
  fields: readonly Pick<TemplateFieldRow, "role" | "type">[],
): boolean {
  return (
    documents.length > 0 &&
    roles.length > 0 &&
    roles.every((role) =>
      fields.some((field) => field.role === role.key && field.type === "signature"),
    )
  );
}

export function toSignTemplateObject(
  row: SignTemplateRow,
  documents: readonly TemplateDocument[],
  fields: readonly TemplateFieldRow[],
  sandbox: boolean,
): SignTemplateObjectOutput {
  return {
    object: "sign_template",
    id: row.id,
    name: row.name,
    title: row.title,
    message: row.message,
    signing_order: row.signingOrder,
    documents: documents.map((document) => ({
      id: document.id,
      filename: document.filename,
      sha256: document.sha256,
      page_count: document.pages.length,
      pages: document.pages,
    })),
    roles: row.roles,
    fields: fields.map((field) => ({
      id: field.id,
      role: field.role,
      document_id: documents[field.document]?.id ?? "",
      type: field.type,
      page: field.page,
      x: field.x,
      y: field.y,
      width: field.width,
      height: field.height,
      required: field.required,
      label: field.label,
      merge_key: field.mergeKey,
    })),
    ready: isReady(row.roles, documents, fields),
    sandbox,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

async function isSandbox(input: { organizationId: string; environmentId: string }) {
  const [row] = await db
    .select({ mode: environment.mode })
    .from(environment)
    .where(
      and(
        eq(environment.id, input.environmentId),
        eq(environment.organizationId, input.organizationId),
      ),
    )
    .limit(1);
  return row?.mode === "sandbox";
}

async function toObject(
  row: SignTemplateRow,
  sandbox?: boolean,
): Promise<SignTemplateObjectOutput> {
  return toSignTemplateObject(
    row,
    await templateDocuments(db, row),
    await templateFields(db, row),
    sandbox ?? (await isSandbox(row)),
  );
}

export async function getSignTemplate(input: TemplateScope): Promise<SignTemplateObjectOutput> {
  if (!isId(ID_PREFIXES.signTemplate, input.templateId)) throw notFound();
  const [row] = await db.select().from(signTemplate).where(scope(input)).limit(1);
  if (!row) throw notFound();
  return toObject(row);
}

export async function listSignTemplates(input: {
  organizationId: string;
  environmentId: string;
  limit?: number;
  after?: string;
}): Promise<{ data: SignTemplateObjectOutput[]; hasMore: boolean }> {
  const limit = Math.min(input.limit ?? DEFAULT_SIGN_LIST_LIMIT, MAX_SIGN_LIST_LIMIT);
  const base = and(
    eq(signTemplate.organizationId, input.organizationId),
    eq(signTemplate.environmentId, input.environmentId),
  );
  let cursor: SQL | undefined;
  if (input.after) {
    if (!isId(ID_PREFIXES.signTemplate, input.after)) return { data: [], hasMore: false };
    const [anchor] = await db
      .select({ id: signTemplate.id, createdAt: signTemplate.createdAt })
      .from(signTemplate)
      .where(and(base, eq(signTemplate.id, input.after)))
      .limit(1);
    if (!anchor) return { data: [], hasMore: false };
    cursor = or(
      lt(signTemplate.createdAt, anchor.createdAt),
      and(eq(signTemplate.createdAt, anchor.createdAt), lt(signTemplate.id, anchor.id)),
    );
  }
  const rows = await db
    .select()
    .from(signTemplate)
    .where(and(base, cursor))
    .orderBy(desc(signTemplate.createdAt), desc(signTemplate.id))
    .limit(limit + 1);
  const sandbox = await isSandbox(input);
  const data: SignTemplateObjectOutput[] = [];
  for (const row of rows.slice(0, limit)) data.push(await toObject(row, sandbox));
  return { data, hasMore: rows.length > limit };
}

type DocumentsInput = NonNullable<CreateSignTemplateRequestOutput["documents"]>;
type FieldsInput = NonNullable<CreateSignTemplateRequestOutput["fields"]>;

/**
 * The template's documents (uploaded ones checked, inline ones stored first) and fields placed on
 * them, by role. Inline documents' rows are returned for the caller's transaction to insert.
 */
async function resolve(
  store: DocumentStore,
  env: SignEnvironment,
  apiKeyId: string | null,
  input: { documents: DocumentsInput; roles: readonly SignTemplateRole[]; fields: FieldsInput },
) {
  const referenced = input.documents.flatMap((document) =>
    "document_id" in document ? [document.document_id] : [],
  );
  if (new Set(referenced).size !== referenced.length) {
    throw new SignError("invalid_document", "A document is listed twice.", { param: "documents" });
  }
  const existing = await environmentDocuments(db, env, referenced);
  for (const [index, document] of input.documents.entries()) {
    if ("document_id" in document && !existing.some((row) => row.id === document.document_id)) {
      throw new SignError(
        "not_found",
        `No document ${document.document_id} exists in this environment.`,
        { param: `documents[${index}].document_id` },
      );
    }
  }
  const keys = new Set<string>();
  for (const [index, role] of input.roles.entries()) {
    if (keys.has(role.key)) {
      throw new SignError("invalid_signers", `The role ${role.key} is listed twice.`, {
        param: `roles[${index}].key`,
      });
    }
    keys.add(role.key);
  }
  const inline: PreparedDocument[] = [];
  for (const document of input.documents) {
    if ("content" in document) {
      inline.push(
        await prepareDocument(store, env, {
          filename: document.filename,
          content: document.content,
          apiKeyId,
        }),
      );
    }
  }
  let nextInline = 0;
  const ordered: TemplateDocument[] = input.documents.map((document) => {
    const row =
      "document_id" in document
        ? existing.find((candidate) => candidate.id === document.document_id)
        : inline[nextInline++];
    if (!row) throw new Error("document missing after upload");
    return {
      id: row.id,
      filename: row.filename,
      sha256: row.sha256,
      pages: row.pages,
      anchors: row.anchors ?? [],
    };
  });
  const placed = [];
  for (const [index, field] of input.fields.entries()) {
    if (!keys.has(field.role)) {
      throw new SignError("invalid_fields", `There is no role ${field.role} in \`roles\`.`, {
        param: `fields[${index}].role`,
      });
    }
    if (field.merge_key && field.type !== "text") {
      throw new SignError("invalid_fields", "Only `text` fields take a `merge_key`.", {
        param: `fields[${index}].merge_key`,
      });
    }
    const { role, merge_key, ...rest } = field;
    for (const one of placeSignerFields(
      [rest as SignFieldInputOutput],
      ordered,
      `fields[${index}]`,
      {
        requireSignature: false,
      },
    )) {
      placed.push({
        role,
        mergeKey: merge_key ?? null,
        document: ordered.findIndex((document) => document.id === one.documentId),
        type: one.type,
        page: one.page,
        x: one.x,
        y: one.y,
        width: one.width,
        height: one.height,
        required: one.required,
        label: one.label,
      });
    }
  }
  checkFieldCount(placed.length);
  return { ordered, inline, placed };
}

async function discard(store: DocumentStore, documents: readonly PreparedDocument[]) {
  if (documents.length === 0) return;
  await store.delete(documents.map((document) => document.storeKey)).catch((error) => {
    console.error("[sign] could not delete unused document bytes:", error);
  });
}

async function replaceChildren(
  tx: Transaction,
  template: Pick<SignTemplateRow, "id" | "organizationId">,
  resolved: Awaited<ReturnType<typeof resolve>>,
) {
  await tx
    .delete(signTemplateField)
    .where(
      and(
        eq(signTemplateField.templateId, template.id),
        eq(signTemplateField.organizationId, template.organizationId),
      ),
    );
  await tx
    .delete(signTemplateDocument)
    .where(
      and(
        eq(signTemplateDocument.templateId, template.id),
        eq(signTemplateDocument.organizationId, template.organizationId),
      ),
    );
  if (resolved.inline.length > 0) await tx.insert(signDocument).values(resolved.inline);
  if (resolved.ordered.length > 0) {
    await tx.insert(signTemplateDocument).values(
      resolved.ordered.map((document, position) => ({
        templateId: template.id,
        documentId: document.id,
        organizationId: template.organizationId,
        position,
      })),
    );
  }
  if (resolved.placed.length > 0) {
    await tx.insert(signTemplateField).values(
      resolved.placed.map((field) => ({
        ...field,
        organizationId: template.organizationId,
        templateId: template.id,
      })),
    );
  }
}

export async function createSignTemplate(
  store: DocumentStore,
  input: {
    environment: SignEnvironment;
    apiKeyId: string | null;
    params: CreateSignTemplateRequestOutput;
  },
): Promise<SignTemplateObjectOutput> {
  const { environment: env, params } = input;
  const roles = params.roles ?? [];
  const resolved = await resolve(store, env, input.apiKeyId, {
    documents: params.documents ?? [],
    roles,
    fields: params.fields ?? [],
  });
  try {
    const row = await db.transaction(async (tx) => {
      const [template] = await tx
        .insert(signTemplate)
        .values({
          organizationId: env.organizationId,
          projectId: env.projectId,
          environmentId: env.environmentId,
          apiKeyId: input.apiKeyId,
          name: params.name,
          title: params.title ?? null,
          message: params.message ?? null,
          signingOrder: params.signing_order ?? "parallel",
          roles,
        })
        .returning();
      if (!template) throw new Error("sign_template insert returned nothing");
      await replaceChildren(tx, template, resolved);
      return template;
    });
    return toObject(row, env.mode === "sandbox");
  } catch (error) {
    await discard(store, resolved.inline);
    throw error;
  }
}

export async function updateSignTemplate(
  store: DocumentStore,
  input: TemplateScope & {
    environment: SignEnvironment;
    apiKeyId: string | null;
    params: UpdateSignTemplateRequestOutput;
  },
): Promise<SignTemplateObjectOutput> {
  if (!isId(ID_PREFIXES.signTemplate, input.templateId)) throw notFound();
  const [current] = await db.select().from(signTemplate).where(scope(input)).limit(1);
  if (!current) throw notFound();
  const { params } = input;
  const replaces =
    params.documents !== undefined || params.roles !== undefined || params.fields !== undefined;
  const roles = params.roles ?? current.roles;
  let resolved: Awaited<ReturnType<typeof resolve>> | null = null;
  if (replaces) {
    const documents =
      params.documents ??
      (await templateDocuments(db, current)).map((document) => ({ document_id: document.id }));
    const fields =
      params.fields ??
      (await templateFields(db, current)).map((field) => ({
        role: field.role,
        type: field.type,
        document: field.document,
        page: field.page,
        x: field.x,
        y: field.y,
        width: field.width,
        height: field.height,
        required: field.required,
        ...(field.label ? { label: field.label } : {}),
        ...(field.mergeKey ? { merge_key: field.mergeKey } : {}),
      }));
    resolved = await resolve(store, input.environment, input.apiKeyId, {
      documents,
      roles,
      fields,
    });
  }
  try {
    const row = await db.transaction(async (tx) => {
      const [template] = await tx
        .update(signTemplate)
        .set({
          ...(params.name !== undefined ? { name: params.name } : {}),
          ...(params.title !== undefined ? { title: params.title } : {}),
          ...(params.message !== undefined ? { message: params.message } : {}),
          ...(params.signing_order !== undefined ? { signingOrder: params.signing_order } : {}),
          roles,
          updatedAt: new Date(),
        })
        .where(scope(input))
        .returning();
      if (!template) throw notFound();
      if (resolved) await replaceChildren(tx, template, resolved);
      return template;
    });
    return toObject(row);
  } catch (error) {
    if (resolved) await discard(store, resolved.inline);
    throw error;
  }
}

/** Deletes the template (requests made from it stay; its documents stay too). */
export async function deleteSignTemplate(input: TemplateScope): Promise<void> {
  if (!isId(ID_PREFIXES.signTemplate, input.templateId)) throw notFound();
  const deleted = await db
    .delete(signTemplate)
    .where(scope(input))
    .returning({ id: signTemplate.id });
  if (deleted.length === 0) throw notFound();
}

/** A request from the template: one signer per role, merge fields filled in. */
export async function createRequestFromTemplate(
  service: Pick<SignService, "create">,
  input: TemplateScope & {
    environment: SignEnvironment;
    apiKeyId: string | null;
    actor: SignActor;
    params: CreateSignRequestFromTemplateRequestOutput;
    idempotencyKey?: string | null;
  },
): Promise<{ request: SignRequestObjectOutput; replayed: boolean }> {
  if (!isId(ID_PREFIXES.signTemplate, input.templateId)) throw notFound();
  const [template] = await db.select().from(signTemplate).where(scope(input)).limit(1);
  if (!template) throw notFound();
  const documents = await templateDocuments(db, template);
  const fields = await templateFields(db, template);
  if (!isReady(template.roles, documents, fields)) {
    throw new SignError(
      "template_incomplete",
      "This template isn't ready: it needs documents, roles and a signature field for every role.",
    );
  }
  const { params } = input;
  for (const [index, signer] of params.signers.entries()) {
    if (!template.roles.some((role) => role.key === signer.role)) {
      throw new SignError("invalid_signers", `The template has no role ${signer.role}.`, {
        param: `signers[${index}].role`,
      });
    }
    if (params.signers.findIndex((other) => other.role === signer.role) !== index) {
      throw new SignError("invalid_signers", `The role ${signer.role} is listed twice.`, {
        param: `signers[${index}].role`,
      });
    }
  }
  const missing = template.roles.find(
    (role) => !params.signers.some((signer) => signer.role === role.key),
  );
  if (missing) {
    throw new SignError("invalid_signers", `Name a signer for the role ${missing.key}.`, {
      param: "signers",
    });
  }
  const mergeKeys = new Set(fields.flatMap((field) => (field.mergeKey ? [field.mergeKey] : [])));
  for (const key of Object.keys(params.merge_fields ?? {})) {
    if (!mergeKeys.has(key)) {
      throw new SignError("invalid_fields", `The template has no merge field ${key}.`, {
        param: `merge_fields.${key}`,
      });
    }
  }
  // Signers in the template's role order (their `order` defaults to it).
  const signers = template.roles.flatMap((role) => {
    const signer = params.signers.find((candidate) => candidate.role === role.key);
    return signer ? [{ role, signer }] : [];
  });
  const prefill = signers.map(({ role }) =>
    fields
      .filter((field) => field.role === role.key)
      .map((field) => (field.mergeKey ? (params.merge_fields?.[field.mergeKey] ?? null) : null)),
  );
  return service.create({
    environment: input.environment,
    apiKeyId: input.apiKeyId,
    actor: input.actor,
    idempotencyKey: input.idempotencyKey,
    templateId: template.id,
    hashSource: { template_id: template.id, ...params },
    prefill,
    params: {
      title: params.title ?? template.title ?? template.name,
      message: params.message ?? template.message ?? undefined,
      documents: documents.map((document) => ({ document_id: document.id })),
      signers: signers.map(({ role, signer }, index) => ({
        name: signer.name,
        email: signer.email,
        delivery: signer.delivery,
        order: signer.order ?? index + 1,
        client_ref: signer.client_ref,
        fields: fields
          .filter((field) => field.role === role.key)
          .map((field) => ({
            type: field.type,
            document: field.document,
            page: field.page,
            x: field.x,
            y: field.y,
            width: field.width,
            height: field.height,
            required: field.required,
            ...(field.label ? { label: field.label } : {}),
          })),
      })),
      signing_order: params.signing_order ?? template.signingOrder,
      expires_at: params.expires_at,
      metadata: params.metadata,
      reminder_interval_days: params.reminder_interval_days,
      send: params.send,
    },
  });
}

/** One of the template's documents' bytes (the builder shows them). */
export async function readSignTemplateDocument(
  input: TemplateScope & { documentId: string; store: DocumentStore },
): Promise<Uint8Array> {
  if (!isId(ID_PREFIXES.signTemplate, input.templateId)) throw notFound();
  const [row] = await db
    .select({ storeKey: signDocument.storeKey })
    .from(signTemplateDocument)
    .innerJoin(
      signTemplate,
      and(
        eq(signTemplate.id, signTemplateDocument.templateId),
        eq(signTemplate.organizationId, signTemplateDocument.organizationId),
      ),
    )
    .innerJoin(
      signDocument,
      and(
        eq(signDocument.id, signTemplateDocument.documentId),
        eq(signDocument.organizationId, signTemplateDocument.organizationId),
      ),
    )
    .where(and(scope(input), eq(signTemplateDocument.documentId, input.documentId)))
    .limit(1);
  const content = row ? await input.store.get(row.storeKey) : null;
  if (!content) throw new SignError("not_found", "No such document in this template.");
  return content;
}
