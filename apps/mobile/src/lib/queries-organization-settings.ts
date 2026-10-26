import type {
  DmarcOverviewResponse,
  DmarcReportResponse,
  MobileDmarcReportSummary,
  OrganizationSettingsResponse,
  ScimSettingsResponse,
  SsoSettingsResponse,
} from "@coss/companion";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useAuth } from "./auth";
import { get, paged, retry, segment, withQuery } from "./queries";

// Organization settings (General, Single sign-on, Directory sync) and DMARC reports.

function orgPath(org: string): string {
  return `/orgs/${segment(org)}`;
}

function dmarcPath(org: string, domainId: string): string {
  return `${orgPath(org)}/domains/${segment(domainId)}/dmarc`;
}

export function useOrganizationSettings(org: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["org", org, "settings"],
    queryFn: () => get<OrganizationSettingsResponse>(api, `${orgPath(org)}/settings`),
    retry,
  });
}

export function useSsoSettings(org: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["org", org, "settings", "sso"],
    queryFn: () => get<SsoSettingsResponse>(api, `${orgPath(org)}/settings/sso`),
    retry,
  });
}

export function useScimSettings(org: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["org", org, "settings", "scim"],
    queryFn: () => get<ScimSettingsResponse>(api, `${orgPath(org)}/settings/scim`),
    retry,
  });
}

export function useDmarc(org: string, domainId: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["org", org, "domains", domainId, "dmarc"],
    queryFn: () => get<DmarcOverviewResponse>(api, dmarcPath(org, domainId)),
    retry,
  });
}

export function useDmarcReports(org: string, domainId: string) {
  const { api } = useAuth();
  return useInfiniteQuery({
    queryKey: ["org", org, "domains", domainId, "dmarc", "reports"],
    ...paged<MobileDmarcReportSummary>(api, (after) =>
      withQuery(`${dmarcPath(org, domainId)}/reports`, { after }),
    ),
  });
}

export function useDmarcReport(org: string, domainId: string, reportId: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["org", org, "domains", domainId, "dmarc", "reports", reportId],
    queryFn: () =>
      get<DmarcReportResponse>(api, `${dmarcPath(org, domainId)}/reports/${segment(reportId)}`),
    retry,
  });
}
