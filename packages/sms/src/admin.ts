/**
 * The admin console's cross-organization reads (`/admin/sms`). Platform-level: call only after
 * `requirePlatformAdmin*`. Never message text: an admin reads that through an audited action.
 */
import { db, schema } from "@coss/db";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";

const { environment, organization, smsAccount, smsMessage, smsRegistration } = schema;

export type AdminSmsRegistration = {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  kind: "us_10dlc" | "toll_free";
  status: string;
  step: string | null;
  legalName: string;
  rejectionReason: string | null;
  submittedAt: Date | null;
  approvedAt: Date | null;
};

/** Registrations across organizations, newest first. */
export async function listSmsRegistrationsForAdmin(
  opts: { limit?: number } = {},
): Promise<AdminSmsRegistration[]> {
  const rows = await db
    .select({ registration: smsRegistration, name: organization.name, slug: organization.slug })
    .from(smsRegistration)
    .innerJoin(organization, eq(organization.id, smsRegistration.organizationId))
    .orderBy(desc(smsRegistration.createdAt))
    .limit(opts.limit ?? 200);
  return rows.map(({ registration, name, slug }) => ({
    id: registration.id,
    organizationId: registration.organizationId,
    organizationName: name,
    organizationSlug: slug,
    kind: registration.kind,
    status: registration.status,
    step: registration.step,
    legalName: registration.profile.legalName,
    rejectionReason: registration.rejectionReason,
    submittedAt: registration.submittedAt,
    approvedAt: registration.approvedAt,
  }));
}

export type AdminSmsSender = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  live: number;
  segments: number;
  failed: number;
  allowedCountries: string[];
  unlockedCountries: string[];
};

/** Organizations that sent live SMS since `since`, most messages first. */
export async function listSmsSendersForAdmin(opts: {
  since: Date;
  limit?: number;
}): Promise<AdminSmsSender[]> {
  const rows = await db
    .select({
      organizationId: smsMessage.organizationId,
      name: organization.name,
      slug: organization.slug,
      live: count(),
      segments: sql<number>`coalesce(sum(${smsMessage.segments}), 0)::int`,
      failed: sql<number>`count(*) filter (where ${smsMessage.status} in ('failed', 'undelivered'))::int`,
      allowed: smsAccount.allowedCountries,
      unlocked: smsAccount.unlockedCountries,
    })
    .from(smsMessage)
    .innerJoin(
      environment,
      and(
        eq(environment.id, smsMessage.environmentId),
        eq(environment.organizationId, smsMessage.organizationId),
      ),
    )
    .innerJoin(organization, eq(organization.id, smsMessage.organizationId))
    .leftJoin(smsAccount, eq(smsAccount.organizationId, smsMessage.organizationId))
    .where(and(gte(smsMessage.createdAt, opts.since), eq(environment.mode, "live")))
    .groupBy(
      smsMessage.organizationId,
      organization.name,
      organization.slug,
      smsAccount.allowedCountries,
      smsAccount.unlockedCountries,
    )
    .orderBy(desc(count()))
    .limit(opts.limit ?? 200);
  return rows.map((row) => ({
    organizationId: row.organizationId,
    organizationName: row.name,
    organizationSlug: row.slug,
    live: row.live,
    segments: row.segments,
    failed: row.failed,
    allowedCountries: row.allowed ?? ["US", "CA"],
    unlockedCountries: row.unlocked ?? [],
  }));
}
