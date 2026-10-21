import type { RiskCalibrationResponse } from "@coss/companion";
import { MIN_CALIBRATION_FEEDBACK, type RiskCalibrationOutput } from "@coss/risk/schemas";

/** What the app's Calibration screen shows: the reasons (the dashboard's page shows no rules). */
export function toMobileRiskCalibration(
  calibration: RiskCalibrationOutput,
): RiskCalibrationResponse {
  return {
    window_days: calibration.window_days,
    assessments: calibration.assessments,
    labeled: calibration.labeled,
    min_feedback: MIN_CALIBRATION_FEEDBACK,
    reasons: calibration.reasons.map((reason) => ({
      code: reason.code,
      fired: reason.fired,
      fraud: reason.fraud,
      legitimate: reason.legitimate,
      precision: reason.precision,
      weight: reason.weight,
      default_weight: reason.default_weight,
      suggested_weight: reason.suggested_weight,
    })),
  };
}
