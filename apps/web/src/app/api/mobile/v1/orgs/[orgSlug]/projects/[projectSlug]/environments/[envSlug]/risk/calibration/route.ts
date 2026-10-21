import type { RiskCalibrationResponse } from "@coss/companion";
import { getRiskCalibration } from "@coss/risk";
import { mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { toMobileRiskCalibration } from "./wire";

export const dynamic = "force-dynamic";

// The dashboard's risk/calibration page.
export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/risk/calibration">,
  ) => {
    const { scope } = await requireMobileEnvironment(request, await ctx.params, {
      risk: ["read"],
    });
    return toMobileRiskCalibration(
      await getRiskCalibration(scope),
    ) satisfies RiskCalibrationResponse;
  },
);
