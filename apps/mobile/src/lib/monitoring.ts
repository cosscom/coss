import { scrubUrl } from "@coss/observability/scrub";
import * as Sentry from "@sentry/react-native";

// Inlined by Metro at bundle time; unset (development) → nothing is reported.
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

// The app's credential (`cm1.<token>.<signature>`, see `@coss/auth/mobile`).
const CREDENTIAL = /\bcm1\.[A-Za-z0-9]{32}\.[A-Za-z0-9_-]{43}\b/g;

/** The servers' URL scrubbing (query strings such as `?code=&state=`), plus the credential. */
function scrub(value: string): string {
  return scrubUrl(value).replace(CREDENTIAL, "cm1.[token]");
}

// The servers' `scrubEvent` is typed for another `@sentry/core` major; an app event carries no
// request or spans (no tracing), so these are the fields that can quote a URL or the credential.
if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: __DEV__ ? "development" : "production",
    // Crashes and errors only. No tracing, profiling, replay, screenshots or view hierarchy: screens
    // show customers' data, and the App Store label stays "not linked to you" (no user is set).
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    enableUserInteractionTracing: false,
    beforeSend: (event) => {
      if (event.message) event.message = scrub(event.message);
      for (const exception of event.exception?.values ?? []) {
        if (exception.value) exception.value = scrub(exception.value);
      }
      if (event.request?.url) event.request.url = scrub(event.request.url);
      if (event.request) delete event.request.headers;
      if (event.extra) delete event.extra.arguments;
      return event;
    },
    beforeBreadcrumb: (breadcrumb) => {
      if (breadcrumb.message) breadcrumb.message = scrub(breadcrumb.message);
      const data = breadcrumb.data;
      if (data) {
        // Raw console arguments can hold anything the app logged.
        delete data.arguments;
        for (const key of ["url", "from", "to"]) {
          if (typeof data[key] === "string") data[key] = scrub(data[key]);
        }
      }
      return breadcrumb;
    },
  });
}

export function reportError(error: unknown): void {
  if (DSN) Sentry.captureException(error);
}

/** `Sentry.wrap` once Sentry is initialised; without a DSN it would only warn. */
export const wrapRoot: typeof Sentry.wrap = DSN ? Sentry.wrap : (component) => component;
