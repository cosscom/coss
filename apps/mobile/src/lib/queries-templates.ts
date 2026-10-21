import type {
  ContentStorageResponse,
  MobileTemplateSummary,
  TemplateResponse,
  TemplateVersionResponse,
  TemplateVersionsResponse,
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

// Email templates (with their versions) and the environment's content storage: read-only.

export function useTemplates(key: EnvironmentKey) {
  const { api } = useAuth();
  return useInfiniteQuery({
    queryKey: ["templates", key],
    ...paged<MobileTemplateSummary>(api, (after) =>
      withQuery(`${apiEnvironmentPath(key)}/templates`, { after }),
    ),
  });
}

export function useTemplate(key: EnvironmentKey, id: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["templates", key, id],
    queryFn: () =>
      get<TemplateResponse>(api, `${apiEnvironmentPath(key)}/templates/${segment(id)}`),
    retry,
  });
}

export function useTemplateVersions(key: EnvironmentKey, id: string) {
  const { api } = useAuth();
  return useInfiniteQuery({
    queryKey: ["templates", key, id, "versions"],
    initialPageParam: null as Cursor,
    queryFn: ({ pageParam }) =>
      get<TemplateVersionsResponse>(
        api,
        withQuery(`${apiEnvironmentPath(key)}/templates/${segment(id)}/versions`, {
          after: pageParam,
        }),
      ),
    getNextPageParam: (page) => page.next_cursor,
    retry,
  });
}

export function useTemplateVersion(key: EnvironmentKey, id: string, version: string) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["templates", key, id, "versions", version],
    queryFn: () =>
      get<TemplateVersionResponse>(
        api,
        `${apiEnvironmentPath(key)}/templates/${segment(id)}/versions/${segment(version)}`,
      ),
    retry,
  });
}

export function useContentStorage(key: EnvironmentKey) {
  const { api } = useAuth();
  return useQuery({
    queryKey: ["content-storage", key],
    queryFn: () => get<ContentStorageResponse>(api, `${apiEnvironmentPath(key)}/content-storage`),
    retry,
  });
}
