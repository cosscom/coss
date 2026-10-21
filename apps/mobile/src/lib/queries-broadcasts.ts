import type {
  BroadcastChangeResponse,
  BroadcastResponse,
  MarketingSettingsResponse,
  MobileBroadcastSummary,
} from "@coss/companion";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./auth";
import {
  apiEnvironmentPath,
  type EnvironmentKey,
  get,
  paged,
  post,
  retry,
  segment,
  withQuery,
} from "./queries";

export function useBroadcasts(key: EnvironmentKey) {
  const { api } = useAuth();
  return useInfiniteQuery({
    queryKey: ["broadcasts", key],
    ...paged<MobileBroadcastSummary>(api, (after) =>
      withQuery(`${apiEnvironmentPath(key)}/broadcasts`, { after }),
    ),
  });
}

export function useBroadcast(key: EnvironmentKey, id: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["broadcasts", key, "broadcast", id],
    queryFn: () =>
      get<BroadcastResponse>(api, `${apiEnvironmentPath(key)}/broadcasts/${segment(id)}`),
    retry,
  });
}

export type BroadcastChange = "pause" | "resume" | "cancel";

/** Pause, resume or cancel (the dashboard's changeBroadcastAction). */
export function useChangeBroadcast(key: EnvironmentKey, id: string) {
  const { api } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (change: BroadcastChange) =>
      post<BroadcastChangeResponse>(
        api,
        `${apiEnvironmentPath(key)}/broadcasts/${segment(id)}/${change}`,
      ),
    // The list and this broadcast (same prefix).
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["broadcasts", key] }),
  });
}

export function useMarketingSettings(key: EnvironmentKey) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["marketing", key],
    queryFn: () => get<MarketingSettingsResponse>(api, `${apiEnvironmentPath(key)}/marketing`),
    retry,
  });
}
