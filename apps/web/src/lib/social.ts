import "server-only";
import { isSocialProvider, SOCIAL_PROVIDERS, type SocialProvider } from "@coss/auth/constants";
import { auth } from "./auth";

/** The social providers this deployment has credentials for (`@coss/auth` `socialProvidersFromEnv`). */
export function enabledSocialProviders(): SocialProvider[] {
  const configured = Object.keys(auth.options.socialProviders ?? {}).filter(isSocialProvider);
  return SOCIAL_PROVIDERS.filter((provider) => configured.includes(provider));
}
