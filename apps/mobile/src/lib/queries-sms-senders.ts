import type {
  DedicatedIpsResponse,
  MobileSmsSuppression,
  SmsSendersResponse,
} from "@coss/companion";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useAuth } from "./auth";
import {
  apiEnvironmentPath,
  type EnvironmentKey,
  get,
  paged,
  retry,
  segment,
  withQuery,
} from "./queries";

/** The organization's SMS numbers, registrations and countries. */
export function useSmsSenders(org: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["org", org, "sms"],
    queryFn: () => get<SmsSendersResponse>(api, `/orgs/${segment(org)}/sms`),
    retry,
  });
}

export function useDedicatedIps(org: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["org", org, "dedicated-ips"],
    queryFn: () => get<DedicatedIpsResponse>(api, `/orgs/${segment(org)}/dedicated-ips`),
    retry,
  });
}

export function useSmsSuppressions(key: EnvironmentKey) {
  const { api } = useAuth();
  return useInfiniteQuery({
    queryKey: ["sms", key, "suppressions"],
    ...paged<MobileSmsSuppression>(api, (after) =>
      withQuery(`${apiEnvironmentPath(key)}/sms/suppressions`, { after }),
    ),
  });
}
