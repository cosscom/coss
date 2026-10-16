/**
 * An invitation is only as good as its inviter: Better Auth accepts it as long as it is pending,
 * even after the person who sent it was removed, left or lost the right to invite. coss.com refuses
 * those at accept time (authoritative, every path) and cancels them when membership changes, so
 * they don't linger in the members list.
 */
import { db, schema } from "@coss/db";
import { and, eq, inArray } from "drizzle-orm";
import { orgRoleCan } from "./permissions.ts";

const { invitation, member } = schema;

function canInvite(role: string | null): boolean {
  return orgRoleCan(role, { invitation: ["create"] });
}

/** Whether the invitation's inviter is still a member of its organization who may invite. */
export async function inviterStillAllowed(input: {
  organizationId: string;
  inviterId: string;
}): Promise<boolean> {
  const [row] = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.organizationId, input.organizationId), eq(member.userId, input.inviterId)))
    .limit(1);
  return canInvite(row?.role ?? null);
}

/**
 * Cancels the organization's pending invitations whose inviter may no longer invite (removed,
 * left, or now a plain member). Returns how many were canceled.
 */
export async function cancelStaleInvitations(organizationId: string): Promise<number> {
  const pending = await db
    .select({ id: invitation.id, inviterRole: member.role })
    .from(invitation)
    .leftJoin(
      member,
      and(
        eq(member.organizationId, invitation.organizationId),
        eq(member.userId, invitation.inviterId),
      ),
    )
    .where(and(eq(invitation.organizationId, organizationId), eq(invitation.status, "pending")));
  const stale = pending.filter((row) => !canInvite(row.inviterRole)).map((row) => row.id);
  if (stale.length === 0) return 0;
  const canceled = await db
    .update(invitation)
    .set({ status: "canceled" })
    .where(
      and(
        eq(invitation.organizationId, organizationId),
        inArray(invitation.id, stale),
        eq(invitation.status, "pending"),
      ),
    )
    .returning({ id: invitation.id });
  return canceled.length;
}
