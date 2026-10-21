import type {
  AudienceResponse,
  ContactPropertiesResponse,
  ContactResponse,
  ContactStatus,
  ContactsResponse,
  MobileAudience,
  MobileSegmentSummary,
  SegmentResponse,
  TopicsResponse,
} from "@coss/companion";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useAuth } from "./auth";
import {
  apiEnvironmentPath,
  type Cursor,
  type EnvironmentKey,
  get,
  paged,
  retry,
  segment,
  withQuery,
} from "./queries";

export function useContacts(
  key: EnvironmentKey,
  filters: { email: string; status: ContactStatus | null },
) {
  const { api } = useAuth();
  return useInfiniteQuery({
    queryKey: ["contacts", key, filters.email, filters.status],
    initialPageParam: null as Cursor,
    queryFn: ({ pageParam }) =>
      get<ContactsResponse>(
        api,
        withQuery(`${apiEnvironmentPath(key)}/contacts`, {
          email: filters.email,
          status: filters.status,
          after: pageParam,
        }),
      ),
    getNextPageParam: (page) => page.next_cursor,
    retry,
  });
}

export function useContact(key: EnvironmentKey, id: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["contacts", key, "contact", id],
    queryFn: () => get<ContactResponse>(api, `${apiEnvironmentPath(key)}/contacts/${segment(id)}`),
    retry,
  });
}

export function useContactProperties(key: EnvironmentKey) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["contacts", key, "properties"],
    queryFn: () =>
      get<ContactPropertiesResponse>(api, `${apiEnvironmentPath(key)}/contacts/properties`),
    retry,
  });
}

export function useAudiences(key: EnvironmentKey) {
  const { api } = useAuth();
  return useInfiniteQuery({
    queryKey: ["audiences", key],
    ...paged<MobileAudience>(api, (after) =>
      withQuery(`${apiEnvironmentPath(key)}/audiences`, { after }),
    ),
  });
}

export function useAudience(key: EnvironmentKey, id: string) {
  const { api } = useAuth();
  return useInfiniteQuery({
    queryKey: ["audiences", key, "audience", id],
    initialPageParam: null as Cursor,
    queryFn: ({ pageParam }) =>
      get<AudienceResponse>(
        api,
        withQuery(`${apiEnvironmentPath(key)}/audiences/${segment(id)}`, { after: pageParam }),
      ),
    getNextPageParam: (page) => page.members.next_cursor,
    retry,
  });
}

export function useSegments(key: EnvironmentKey) {
  const { api } = useAuth();
  return useInfiniteQuery({
    queryKey: ["segments", key],
    ...paged<MobileSegmentSummary>(api, (after) =>
      withQuery(`${apiEnvironmentPath(key)}/segments`, { after }),
    ),
  });
}

export function useSegment(key: EnvironmentKey, id: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["segments", key, "segment", id],
    queryFn: () => get<SegmentResponse>(api, `${apiEnvironmentPath(key)}/segments/${segment(id)}`),
    retry,
  });
}

export function useTopics(key: EnvironmentKey) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["topics", key],
    queryFn: () => get<TopicsResponse>(api, `${apiEnvironmentPath(key)}/topics`),
    retry,
  });
}
