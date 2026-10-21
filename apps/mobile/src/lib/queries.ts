import type {
  ApiKeysResponse,
  AuditResponse,
  BillingResponse,
  Domain,
  DomainsResponse,
  EmailListResponse,
  EmailResponse,
  EmailStatus,
  EnvironmentResponse,
  HookApplication,
  HookApplicationResponse,
  HookEndpointResponse,
  HookEventType,
  HookMessageResponse,
  Invoice,
  LogDrainResponse,
  LogDrainsResponse,
  LogEntry,
  LogEntryResponse,
  LogRange,
  LogSource,
  MembersResponse,
  MeResponse,
  MobileReceivedSms,
  OrganizationResponse,
  Page,
  PushCategory,
  PushSettings,
  ReceivedEmail,
  ReceivedEmailSummary,
  RecoverRequest,
  RecoverResponse,
  ReputationResponse,
  RescheduleEmailRequest,
  RescheduleEmailResponse,
  RiskAssessment,
  RiskAssessmentsResponse,
  RiskFeedbackRequest,
  RiskListEntry,
  RiskRule,
  SmsListResponse,
  SmsResponse,
  SmsStatus,
  Suppression,
  TrackingSettings,
  UpdatePushRequest,
  WebhookEndpoint,
  WebhookEndpointEnabledRequest,
  WebhookEndpointResponse,
} from "@coss/companion";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// Each product area added after the first release keeps its hooks in `queries-<area>.ts`, built on
// the helpers exported here.
import type { ApiClient, ApiError } from "./api";
import { useAuth } from "./auth";

export class ApiRequestError extends Error {
  constructor(readonly error: ApiError) {
    super(error.message);
  }
}

export async function get<T>(api: ApiClient, path: string): Promise<T> {
  const { data, error } = await api<T>(path);
  if (error) throw new ApiRequestError(error);
  return data;
}

export function retry(failures: number, error: Error): boolean {
  const code = error instanceof ApiRequestError ? error.error.code : null;
  return failures < 2 && (code === "network_error" || code === "internal_error");
}

export const segment = encodeURIComponent;

export type EnvironmentKey = { org: string; project: string; env: string };

/** The mobile API path of an environment (`lib/web.ts`'s `environmentPath` is the dashboard's). */
export function apiEnvironmentPath({ org, project, env }: EnvironmentKey): string {
  return `/orgs/${segment(org)}/projects/${segment(project)}/environments/${segment(env)}`;
}

export function useMe() {
  const { api } = useAuth();
  return useQuery({ queryKey: ["me"], queryFn: () => get<MeResponse>(api, "/me"), retry });
}

export function useOrganization(org: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["org", org],
    queryFn: () => get<OrganizationResponse>(api, `/orgs/${segment(org)}`),
    retry,
  });
}

export function useReputation(org: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["org", org, "reputation"],
    queryFn: () => get<ReputationResponse>(api, `/orgs/${segment(org)}/reputation`),
    retry,
  });
}

export function useEnvironment(key: EnvironmentKey) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["env", key],
    queryFn: () => get<EnvironmentResponse>(api, apiEnvironmentPath(key)),
    retry,
  });
}

export function useEmails(key: EnvironmentKey, status: EmailStatus | null) {
  const { api } = useAuth();
  return useInfiniteQuery({
    queryKey: ["emails", key, status],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => {
      const query = new URLSearchParams();
      if (status) query.set("status", status);
      if (pageParam) query.set("before", pageParam);
      return get<EmailListResponse>(api, `${apiEnvironmentPath(key)}/emails?${query}`);
    },
    getNextPageParam: (page) => page.next_cursor,
    retry,
  });
}

export function useEmail(key: EnvironmentKey, id: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["email", key, id],
    queryFn: () => get<EmailResponse>(api, `${apiEnvironmentPath(key)}/emails/${segment(id)}`),
    retry,
  });
}

export type Cursor = string | null;

export function paged<T>(api: ApiClient, path: (after: Cursor) => string) {
  return {
    initialPageParam: null as Cursor,
    queryFn: ({ pageParam }: { pageParam: Cursor }) => get<Page<T>>(api, path(pageParam)),
    getNextPageParam: (page: Page<T>) => page.next_cursor,
    retry,
  };
}

export function withQuery(path: string, params: Record<string, string | null | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}

export function useDomains(org: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["org", org, "domains"],
    queryFn: () => get<DomainsResponse>(api, `/orgs/${segment(org)}/domains`),
    retry,
  });
}

export function useDomain(org: string, id: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["org", org, "domains", id],
    queryFn: () => get<Domain>(api, `/orgs/${segment(org)}/domains/${segment(id)}`),
    retry,
  });
}

export function useMembers(org: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["org", org, "members"],
    queryFn: () => get<MembersResponse>(api, `/orgs/${segment(org)}/members`),
    retry,
  });
}

export function useBilling(org: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["org", org, "billing"],
    queryFn: () => get<BillingResponse>(api, `/orgs/${segment(org)}/billing`),
    retry,
  });
}

export function useInvoice(org: string, id: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["org", org, "invoices", id],
    queryFn: () => get<Invoice>(api, `/orgs/${segment(org)}/billing/invoices/${segment(id)}`),
    retry,
  });
}

export function useAudit(org: string) {
  const { api } = useAuth();
  return useInfiniteQuery({
    queryKey: ["org", org, "audit"],
    initialPageParam: null as Cursor,
    queryFn: ({ pageParam }) =>
      get<AuditResponse>(api, withQuery(`/orgs/${segment(org)}/audit`, { after: pageParam })),
    getNextPageParam: (page) => page.next_cursor,
    retry,
  });
}

export function useReceivedEmails(key: EnvironmentKey) {
  const { api } = useAuth();
  return useInfiniteQuery({
    queryKey: ["received", key],
    ...paged<ReceivedEmailSummary>(api, (after) =>
      withQuery(`${apiEnvironmentPath(key)}/received`, { after }),
    ),
  });
}

export function useReceivedEmail(key: EnvironmentKey, id: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["received", key, id],
    queryFn: () => get<ReceivedEmail>(api, `${apiEnvironmentPath(key)}/received/${segment(id)}`),
    retry,
  });
}

export function useSmsList(key: EnvironmentKey, statuses: readonly SmsStatus[] | null) {
  const { api } = useAuth();
  return useInfiniteQuery({
    queryKey: ["sms", key, statuses],
    initialPageParam: null as Cursor,
    queryFn: ({ pageParam }) =>
      get<SmsListResponse>(
        api,
        withQuery(`${apiEnvironmentPath(key)}/sms`, {
          status: statuses?.join(","),
          after: pageParam,
        }),
      ),
    getNextPageParam: (page) => page.next_cursor,
    retry,
  });
}

export function useSms(key: EnvironmentKey, id: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["sms", key, "message", id],
    queryFn: () => get<SmsResponse>(api, `${apiEnvironmentPath(key)}/sms/${segment(id)}`),
    retry,
  });
}

export function useReceivedSms(key: EnvironmentKey) {
  const { api } = useAuth();
  return useInfiniteQuery({
    queryKey: ["sms", key, "received"],
    ...paged<MobileReceivedSms>(api, (after) =>
      withQuery(`${apiEnvironmentPath(key)}/sms/received`, { after }),
    ),
  });
}

export function useLogs(
  key: EnvironmentKey,
  filters: { range: LogRange; source: LogSource | null; q: string },
) {
  const { api } = useAuth();
  return useInfiniteQuery({
    queryKey: ["logs", key, filters],
    ...paged<LogEntry>(api, (after) =>
      withQuery(`${apiEnvironmentPath(key)}/logs`, {
        range: filters.range,
        source: filters.source,
        q: filters.q,
        after,
      }),
    ),
  });
}

export function useLogEntry(key: EnvironmentKey, id: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["logs", key, "entry", id],
    queryFn: () => get<LogEntryResponse>(api, `${apiEnvironmentPath(key)}/logs/${segment(id)}`),
    retry,
  });
}

export function useSuppressions(key: EnvironmentKey, address: string) {
  const { api } = useAuth();
  return useInfiniteQuery({
    queryKey: ["suppressions", key, address],
    ...paged<Suppression>(api, (after) =>
      withQuery(`${apiEnvironmentPath(key)}/suppressions`, { address, after }),
    ),
  });
}

export function useApiKeys(key: EnvironmentKey) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["api-keys", key],
    queryFn: () => get<ApiKeysResponse>(api, `${apiEnvironmentPath(key)}/api-keys`),
    retry,
  });
}

export function useWebhookEndpoints(key: EnvironmentKey) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["webhooks", key],
    queryFn: () => get<{ data: WebhookEndpoint[] }>(api, `${apiEnvironmentPath(key)}/webhooks`),
    retry,
  });
}

export function useWebhookEndpoint(key: EnvironmentKey, id: string, status: string | null) {
  const { api } = useAuth();
  return useInfiniteQuery({
    queryKey: ["webhooks", key, id, status],
    initialPageParam: null as Cursor,
    queryFn: ({ pageParam }) =>
      get<WebhookEndpointResponse>(
        api,
        withQuery(`${apiEnvironmentPath(key)}/webhooks/${segment(id)}`, {
          status,
          after: pageParam,
        }),
      ),
    getNextPageParam: (page) => page.deliveries.next_cursor,
    retry,
  });
}

export function useRiskAssessments(key: EnvironmentKey, view: string) {
  const { api } = useAuth();
  return useInfiniteQuery({
    queryKey: ["risk", key, view],
    initialPageParam: null as Cursor,
    queryFn: ({ pageParam }) =>
      get<RiskAssessmentsResponse>(
        api,
        withQuery(`${apiEnvironmentPath(key)}/risk`, { view, after: pageParam }),
      ),
    getNextPageParam: (page) => page.next_cursor,
    retry,
  });
}

export function useRiskAssessment(key: EnvironmentKey, id: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["risk", key, "assessment", id],
    queryFn: () => get<RiskAssessment>(api, `${apiEnvironmentPath(key)}/risk/${segment(id)}`),
    retry,
  });
}

export async function post<T>(api: ApiClient, path: string, body?: unknown): Promise<T> {
  const { data, error } = await api<T>(path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (error) throw new ApiRequestError(error);
  return data;
}

export function useRetryDelivery(key: EnvironmentKey, endpointId: string) {
  const { api } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deliveryId: string) =>
      post<{ retried: true }>(
        api,
        `${apiEnvironmentPath(key)}/webhooks/${segment(endpointId)}/deliveries/${segment(deliveryId)}/retry`,
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks", key, endpointId] }),
  });
}

export function useRiskFeedback(key: EnvironmentKey, id: string) {
  const { api } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RiskFeedbackRequest) =>
      post<RiskAssessment>(api, `${apiEnvironmentPath(key)}/risk/${segment(id)}/feedback`, body),
    onSuccess: (assessment) => {
      queryClient.setQueryData(["risk", key, "assessment", id], assessment);
      void queryClient.invalidateQueries({ queryKey: ["risk", key] });
    },
  });
}

export function useHookApplications(key: EnvironmentKey, q: string) {
  const { api } = useAuth();
  return useInfiniteQuery({
    queryKey: ["hooks", key, "applications", q],
    ...paged<HookApplication>(api, (after) =>
      withQuery(`${apiEnvironmentPath(key)}/hooks`, { q, after }),
    ),
  });
}

export function useHookApplication(key: EnvironmentKey, application: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["hooks", key, "application", application],
    queryFn: () =>
      get<HookApplicationResponse>(api, `${apiEnvironmentPath(key)}/hooks/${segment(application)}`),
    retry,
  });
}

export function useHookEndpoint(key: EnvironmentKey, application: string, endpoint: string) {
  const { api } = useAuth();
  return useInfiniteQuery({
    queryKey: ["hooks", key, "endpoint", application, endpoint],
    initialPageParam: null as Cursor,
    queryFn: ({ pageParam }) =>
      get<HookEndpointResponse>(
        api,
        withQuery(
          `${apiEnvironmentPath(key)}/hooks/${segment(application)}/endpoints/${segment(endpoint)}`,
          { after: pageParam },
        ),
      ),
    getNextPageParam: (page) => page.deliveries.next_cursor,
    retry,
  });
}

export function useHookMessage(key: EnvironmentKey, application: string, message: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["hooks", key, "message", application, message],
    queryFn: () =>
      get<HookMessageResponse>(
        api,
        `${apiEnvironmentPath(key)}/hooks/${segment(application)}/messages/${segment(message)}`,
      ),
    retry,
  });
}

export function useHookEventTypes(key: EnvironmentKey) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["hooks", key, "event-types"],
    queryFn: () =>
      get<{ data: HookEventType[] }>(api, `${apiEnvironmentPath(key)}/hooks/event-types`),
    retry,
  });
}

export function useTracking(key: EnvironmentKey) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["tracking", key],
    queryFn: () => get<TrackingSettings>(api, `${apiEnvironmentPath(key)}/tracking`),
    retry,
  });
}

export function useLogDrains(key: EnvironmentKey) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["log-drains", key],
    queryFn: () => get<LogDrainsResponse>(api, `${apiEnvironmentPath(key)}/log-drains`),
    retry,
  });
}

export function useLogDrain(key: EnvironmentKey, id: string) {
  const { api } = useAuth();
  return useInfiniteQuery({
    queryKey: ["log-drains", key, id],
    initialPageParam: null as Cursor,
    queryFn: ({ pageParam }) =>
      get<LogDrainResponse>(
        api,
        withQuery(`${apiEnvironmentPath(key)}/log-drains/${segment(id)}`, { after: pageParam }),
      ),
    getNextPageParam: (page) => page.batches.next_cursor,
    retry,
  });
}

export function useRiskRules(key: EnvironmentKey) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["risk", key, "rules"],
    queryFn: () => get<{ data: RiskRule[] }>(api, `${apiEnvironmentPath(key)}/risk/rules`),
    retry,
  });
}

export function useRiskLists(key: EnvironmentKey, list: string | null) {
  const { api } = useAuth();
  return useInfiniteQuery({
    queryKey: ["risk", key, "lists", list],
    ...paged<RiskListEntry>(api, (after) =>
      withQuery(`${apiEnvironmentPath(key)}/risk/lists`, { list, after }),
    ),
  });
}

export function useCancelEmail(key: EnvironmentKey, id: string) {
  const { api } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      post<{ canceled: true }>(api, `${apiEnvironmentPath(key)}/emails/${segment(id)}/cancel`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["email", key, id] });
      void queryClient.invalidateQueries({ queryKey: ["emails", key] });
    },
  });
}

export function useRecoverEndpoint(key: EnvironmentKey, endpointId: string) {
  const { api } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sinceHours: RecoverRequest["since_hours"]) =>
      post<RecoverResponse>(
        api,
        `${apiEnvironmentPath(key)}/webhooks/${segment(endpointId)}/recover`,
        { since_hours: sinceHours },
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks", key, endpointId] }),
  });
}

/** One-click outcomes from the review queue (the dashboard's ResolveButtons). */
export function useResolveReview(key: EnvironmentKey) {
  const { api } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome: RiskFeedbackRequest["outcome"] }) =>
      post<RiskAssessment>(api, `${apiEnvironmentPath(key)}/risk/${segment(id)}/feedback`, {
        outcome,
      }),
    onSuccess: (assessment) => {
      queryClient.setQueryData(["risk", key, "assessment", assessment.id], assessment);
      void queryClient.invalidateQueries({ queryKey: ["risk", key] });
    },
  });
}

export function useSetEndpointEnabled(key: EnvironmentKey, endpointId: string) {
  const { api } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enabled: WebhookEndpointEnabledRequest["enabled"]) =>
      post<WebhookEndpointEnabledRequest>(
        api,
        `${apiEnvironmentPath(key)}/webhooks/${segment(endpointId)}/enabled`,
        { enabled },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["webhooks", key] });
    },
  });
}

export function useRescheduleEmail(key: EnvironmentKey, id: string) {
  const { api } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scheduledAt: string) =>
      post<RescheduleEmailResponse>(
        api,
        `${apiEnvironmentPath(key)}/emails/${segment(id)}/reschedule`,
        {
          scheduled_at: scheduledAt,
        } satisfies RescheduleEmailRequest,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["email", key, id] });
      void queryClient.invalidateQueries({ queryKey: ["emails", key] });
    },
  });
}

export function usePushSettings() {
  const { api } = useAuth();
  return useQuery({ queryKey: ["push"], queryFn: () => get<PushSettings>(api, "/push"), retry });
}

/** Turns categories on or off for this device (optimistically: the switch moves at once). */
export function useUpdatePushCategories() {
  const { api } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (categories: Record<PushCategory, boolean>) => {
      const body: UpdatePushRequest = {
        categories: (Object.keys(categories) as PushCategory[]).filter((key) => categories[key]),
      };
      const { data, error } = await api<PushSettings>("/push", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (error) throw new ApiRequestError(error);
      return data;
    },
    onMutate: (categories) => {
      const previous = queryClient.getQueryData<PushSettings>(["push"]);
      if (previous) queryClient.setQueryData<PushSettings>(["push"], { ...previous, categories });
      return { previous };
    },
    onError: (_error, _categories, context) => {
      if (context?.previous) queryClient.setQueryData(["push"], context.previous);
    },
    onSuccess: (settings) => queryClient.setQueryData(["push"], settings),
  });
}
