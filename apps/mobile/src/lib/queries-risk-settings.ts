import type {
  HookPortalSettingsResponse,
  RiskCalibrationResponse,
  RiskLimitBucketsResponse,
  RiskSettingsResponse,
} from "@coss/companion";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./auth";
import { apiEnvironmentPath, type EnvironmentKey, get, retry } from "./queries";

// Risk rate limits, calibration and settings, and the Hooks portal settings (all read-only).

export function useRiskLimitBuckets(key: EnvironmentKey) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["risk", key, "limits"],
    queryFn: () => get<RiskLimitBucketsResponse>(api, `${apiEnvironmentPath(key)}/risk/limits`),
    retry,
  });
}

export function useRiskCalibration(key: EnvironmentKey) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["risk", key, "calibration"],
    queryFn: () => get<RiskCalibrationResponse>(api, `${apiEnvironmentPath(key)}/risk/calibration`),
    retry,
  });
}

export function useRiskSettings(key: EnvironmentKey) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["risk", key, "settings"],
    queryFn: () => get<RiskSettingsResponse>(api, `${apiEnvironmentPath(key)}/risk/settings`),
    retry,
  });
}

export function useHookPortalSettings(key: EnvironmentKey) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["hooks", key, "settings"],
    queryFn: () =>
      get<HookPortalSettingsResponse>(api, `${apiEnvironmentPath(key)}/hooks/settings`),
    retry,
  });
}
