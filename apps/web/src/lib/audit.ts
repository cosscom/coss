import "server-only";
import { type OrgAuditActor, recordOrgAuditEvent } from "@coss/logs";
import { headers } from "next/headers";
import { env } from "@/env";
import type { Session } from "./auth";

export type AuditInput = {
  organizationId: string;
  /** `<resource>.<verb>`, e.g. `api_key.created`. */
  action: string;
  target?: { type: string; id: string | null; label?: string | null };
  projectId?: string | null;
  environmentId?: string | null;
  metadata?: Record<string, unknown>;
};

/** The signed-in user as an audit actor (an impersonating admin is noted, never hidden). */
export function sessionActor(session: Session): OrgAuditActor {
  return { type: "user", id: session.user.id, label: session.user.email };
}

/** The client address `src/proxy.ts` vouched for, if proxies are configured. */
async function requestContext(): Promise<{ clientIp: string | null; userAgent: string | null }> {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for");
  const clientIp =
    env.TRUSTED_PROXY_HOPS > 0 && forwarded && forwarded !== "unknown" ? forwarded : null;
  return { clientIp, userAgent: list.get("user-agent") };
}

/**
 * Records a change a member made in the dashboard in the organization's audit log. Called after
 * the change succeeded; a failure to record is logged, never shown (the change already happened).
 */
export async function recordAudit(session: Session, input: AuditInput): Promise<void> {
  try {
    const impersonatedBy = session.session.impersonatedBy ?? null;
    await recordOrgAuditEvent({
      ...input,
      actor: sessionActor(session),
      metadata: {
        ...input.metadata,
        ...(impersonatedBy ? { impersonated_by: impersonatedBy } : {}),
      },
      ...(await requestContext()),
    });
  } catch (error) {
    console.error(`[web] audit event ${input.action} not recorded:`, error);
  }
}

/**
 * What a platform admin did to an organization, in that organization's own audit log. The actor is
 * "COSS support", never the admin, and the reason (admin-internal) is never copied.
 */
export async function supportAudit(
  organizationId: string,
  action: string,
  target?: { type: string; id: string | null },
): Promise<void> {
  try {
    await recordOrgAuditEvent({
      organizationId,
      actor: { type: "system", id: null, label: "COSS support" },
      action,
      target,
    });
  } catch (error) {
    console.error(`[web] audit event ${action} not recorded:`, error);
  }
}
