import type { RiskRule } from "@coss/companion";
import { listRiskRules } from "@coss/risk";
import { mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { describeRuleConditions } from "@/lib/risk-rules";

export const dynamic = "force-dynamic";

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/risk/rules">,
  ) => {
    const { scope } = await requireMobileEnvironment(request, await ctx.params, {
      riskRule: ["read"],
    });
    const rules = await listRiskRules(scope);
    return {
      data: rules.data.map((rule) => ({
        id: rule.id,
        name: rule.name,
        enabled: rule.enabled,
        position: rule.position,
        events: rule.events,
        when: describeRuleConditions(rule),
        action: rule.action,
      })),
    } satisfies { data: RiskRule[] };
  },
);
