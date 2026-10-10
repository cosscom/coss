import "server-only";
import { createEmailRuntime, type EmailRuntime, emailRuntimeConfig } from "@coss/email/runtime";
import { env } from "@/env";

// One runtime (providers, AWS clients) per server process, kept across dev HMR re-evaluations.
const globalForEmail = globalThis as unknown as { __cossEmailRuntime?: EmailRuntime };

/** Email providers configured by `EMAIL_PROVIDER`, for domain management from the dashboard. */
export function emailRuntime(): EmailRuntime {
  globalForEmail.__cossEmailRuntime ??= createEmailRuntime(emailRuntimeConfig(env));
  return globalForEmail.__cossEmailRuntime;
}
