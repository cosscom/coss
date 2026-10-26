// Pure (no React Native imports) so `bun test` can load it.

const SEGMENT = "[A-Za-z0-9_-]+";
const ENV = `/${SEGMENT}/projects/${SEGMENT}/${SEGMENT}`;

/** The pages a push notification may open: exactly the paths `@coss/push` builds. */
const ROUTES = [
  `/${SEGMENT}/reputation`,
  `/${SEGMENT}/settings/billing`,
  `/${SEGMENT}/settings/billing/invoices/${SEGMENT}`,
  `/${SEGMENT}/spend`,
  `${ENV}/webhooks/${SEGMENT}`,
  `${ENV}/hooks/${SEGMENT}/endpoints/${SEGMENT}`,
  `${ENV}/log-drains/${SEGMENT}`,
  `${ENV}/risk`,
].map((pattern) => new RegExp(`^${pattern}$`));

/** The app route a notification's `data` points at, or null for anything else. */
export function routeFromNotification(data: unknown): string | null {
  const path = (data as { path?: unknown } | null | undefined)?.path;
  if (typeof path !== "string") return null;
  return ROUTES.some((route) => route.test(path)) ? path : null;
}
