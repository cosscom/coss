import {
  createEmailRuntime,
  type EmailEnv,
  type EmailRuntime,
  emailRuntimeConfig,
} from "@coss/email/runtime";

/**
 * The email product's providers for the validated env (sandbox environments always use the fake
 * provider). One per process: the SES clients and their connection pools are shared.
 */
export function createDefaultEmailRuntime(
  env: EmailEnv = { EMAIL_PROVIDER: "fake" },
  opts: { trackingBaseUrl: string },
): EmailRuntime {
  return createEmailRuntime({ ...emailRuntimeConfig(env), trackingBaseUrl: opts.trackingBaseUrl });
}
