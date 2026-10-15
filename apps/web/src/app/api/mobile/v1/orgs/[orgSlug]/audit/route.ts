import { BillingError } from "@coss/billing";
import type { AuditResponse } from "@coss/companion";
import { listOrgAuditEvents } from "@coss/logs";
import { auditActorLabel, auditLabels, describeAction, details } from "@/lib/audit-labels";
import { planGate } from "@/lib/billing";
import {
  cursorParam,
  mobileRoute,
  requireMobileOrgMember,
  requireMobilePermission,
} from "@/lib/mobile-api";
import { toMobileAuditEvent } from "@/lib/mobile-wire";

export const dynamic = "force-dynamic";

export const GET = mobileRoute(
  async (request, ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/audit">) => {
    const context = await requireMobileOrgMember(request, (await ctx.params).orgSlug);
    requireMobilePermission(context, { audit: ["read"] });
    const organizationId = context.organization.id;
    try {
      await planGate().requireFeature(organizationId, "auditLog");
    } catch (error) {
      if (error instanceof BillingError) {
        return { plan_allows: false, data: [], next_cursor: null } satisfies AuditResponse;
      }
      throw error;
    }
    const { events, nextBefore } = await listOrgAuditEvents({
      organizationId,
      before: cursorParam(request),
      limit: 50,
    });
    const { environmentNames, keyNames } = await auditLabels(
      organizationId,
      events.flatMap((event) =>
        event.actor_type === "api_key" && event.actor_id ? [event.actor_id] : [],
      ),
    );
    return {
      plan_allows: true,
      data: events.map((event) =>
        toMobileAuditEvent(event, {
          actor: auditActorLabel(event, keyNames),
          actionLabel: describeAction(event.action),
          details: details(event),
          environment: event.environment_id
            ? (environmentNames[event.environment_id] ?? null)
            : null,
        }),
      ),
      next_cursor: nextBefore,
    } satisfies AuditResponse;
  },
);
