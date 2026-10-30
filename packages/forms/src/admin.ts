/**
 * The platform admin console's view of forms (`/admin/forms`): every organization's hosted pages
 * and busiest forms, and disabling one (phishing, spam). Platform-level: call only after
 * `requirePlatformAdmin*`. A form disabled by an admin answers like a missing one and only an
 * admin turns it back on.
 */
import { db, type Executor, schema } from "@coss/db";
import { ID_PREFIXES, isId } from "@coss/db/id";
import { and, desc, eq, isNotNull, lt, sql } from "drizzle-orm";
import { FormError } from "./errors.ts";

const { environment, form, organization } = schema;

export type AdminFormRow = {
  id: string;
  name: string;
  organizationId: string;
  organizationSlug: string;
  organizationName: string;
  mode: "live" | "sandbox";
  hosted: boolean;
  enabled: boolean;
  disabledByAdminAt: Date | null;
  submissionsLastDay: number;
  createdAt: Date;
};

/** Forms of every organization, newest first; `hostedOnly`: published hosted pages only. */
export async function listFormsForAdmin(input: {
  hostedOnly?: boolean;
  disabledOnly?: boolean;
  before?: string;
  limit?: number;
}): Promise<{ data: AdminFormRow[]; hasMore: boolean }> {
  const limit = input.limit ?? 50;
  const rows = await db
    .select({
      id: form.id,
      name: form.name,
      organizationId: form.organizationId,
      organizationSlug: organization.slug,
      organizationName: organization.name,
      mode: environment.mode,
      hostedPublishedAt: form.hostedPublishedAt,
      enabled: form.enabled,
      disabledByAdminAt: form.disabledByAdminAt,
      createdAt: form.createdAt,
      submissionsLastDay: sql<number>`(select count(*)::int from ${schema.formSubmission} where ${schema.formSubmission.formId} = ${form.id} and ${schema.formSubmission.createdAt} > now() - interval '1 day')`,
    })
    .from(form)
    .innerJoin(organization, eq(organization.id, form.organizationId))
    .innerJoin(
      environment,
      and(
        eq(environment.id, form.environmentId),
        eq(environment.organizationId, form.organizationId),
      ),
    )
    .where(
      and(
        input.hostedOnly ? isNotNull(form.hostedPublishedAt) : undefined,
        input.disabledOnly ? isNotNull(form.disabledByAdminAt) : undefined,
        input.before && isId(ID_PREFIXES.form, input.before)
          ? lt(form.id, input.before)
          : undefined,
      ),
    )
    .orderBy(desc(form.id))
    .limit(limit + 1);
  return {
    data: rows.slice(0, limit).map(({ hostedPublishedAt, ...row }) => ({
      ...row,
      hosted: hostedPublishedAt !== null,
    })),
    hasMore: rows.length > limit,
  };
}

/** Disables (or re-enables) a form for abuse; returns its organization. */
export async function setFormDisabledByAdmin(
  formId: string,
  disabled: boolean,
  executor: Executor = db,
): Promise<{ organizationId: string; name: string }> {
  if (!isId(ID_PREFIXES.form, formId)) throw new FormError("not_found", "Form not found.");
  const [row] = await executor
    .update(form)
    .set({ disabledByAdminAt: disabled ? new Date() : null })
    .where(eq(form.id, formId))
    .returning({ organizationId: form.organizationId, name: form.name });
  if (!row) throw new FormError("not_found", "Form not found.");
  return row;
}
