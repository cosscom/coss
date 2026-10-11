import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { uniqueSuffix } from "@coss/db/testing";
import { RETENTION_DAYS } from "@coss/retention";
import { eq } from "drizzle-orm";
import { purgeExpiredAdminAuditEvents, purgeExpiredAuthRows } from "../src/retention.ts";
import { createTestTenant } from "../src/testing.ts";

const { adminAuditEvent, invitation, session, verification } = schema;
const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS);

describe("purgeExpiredAuthRows", () => {
  test("deletes sessions, tokens and invitations expired before the cutoff", async () => {
    const tenant = await createTestTenant();
    const userId = tenant.owner.id;
    const organizationId = tenant.organization.id;
    const identifier = `reset-password:${uniqueSuffix()}`;
    const old = daysAgo(RETENTION_DAYS.expiredAuth + 1);
    const recent = daysAgo(RETENTION_DAYS.expiredAuth - 1);
    const sessionRow = (id: string, expiresAt: Date) => ({
      id,
      token: `${id}-token`,
      userId,
      expiresAt,
      updatedAt: new Date(),
    });
    const suffix = uniqueSuffix();
    await db
      .insert(session)
      .values([sessionRow(`sess_old_${suffix}`, old), sessionRow(`sess_new_${suffix}`, recent)]);
    await db.insert(verification).values([
      { id: `ver_old_${suffix}`, identifier, value: "x", expiresAt: old },
      { id: `ver_new_${suffix}`, identifier, value: "y", expiresAt: recent },
    ]);
    await db.insert(invitation).values([
      {
        id: `invite_old_${suffix}`,
        organizationId,
        email: "a@example.com",
        expiresAt: old,
        inviterId: userId,
      },
      {
        id: `invite_new_${suffix}`,
        organizationId,
        email: "b@example.com",
        expiresAt: recent,
        inviterId: userId,
      },
    ]);

    const scope = {
      userIds: [userId],
      identifiers: [identifier],
      organizationIds: [organizationId],
    };
    expect(await purgeExpiredAuthRows({ scope })).toEqual({
      sessions: 1,
      verifications: 1,
      invitations: 1,
    });
    const ids = async (rows: Promise<{ id: string }[]>) => (await rows).map((row) => row.id);
    expect(
      await ids(db.select({ id: session.id }).from(session).where(eq(session.userId, userId))),
    ).toEqual([`sess_new_${suffix}`]);
    expect(
      await ids(
        db
          .select({ id: verification.id })
          .from(verification)
          .where(eq(verification.identifier, identifier)),
      ),
    ).toEqual([`ver_new_${suffix}`]);
    expect(
      await ids(
        db
          .select({ id: invitation.id })
          .from(invitation)
          .where(eq(invitation.organizationId, organizationId)),
      ),
    ).toEqual([`invite_new_${suffix}`]);
  });
});

describe("purgeExpiredAdminAuditEvents", () => {
  test("deletes events older than the cutoff", async () => {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    const event = (createdAt: Date) => ({
      actorEmail: "admin@coss.test",
      action: "organization.suspend",
      targetType: "organization",
      targetId: organizationId,
      organizationId,
      createdAt,
    });
    const [, kept] = await db
      .insert(adminAuditEvent)
      .values([
        event(daysAgo(RETENTION_DAYS.adminAuditLog + 1)),
        event(daysAgo(RETENTION_DAYS.adminAuditLog - 1)),
      ])
      .returning({ id: adminAuditEvent.id });

    expect(
      await purgeExpiredAdminAuditEvents({ scope: { organizationIds: [organizationId] } }),
    ).toBe(1);
    const left = await db
      .select({ id: adminAuditEvent.id })
      .from(adminAuditEvent)
      .where(eq(adminAuditEvent.organizationId, organizationId));
    expect(left).toEqual([{ id: kept?.id as string }]);
  });
});
