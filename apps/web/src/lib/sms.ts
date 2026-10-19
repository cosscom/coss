import "server-only";
import type { SmsSenderDeps } from "@coss/sms";
import { createSmsRuntime, type SmsRuntime } from "@coss/sms/runtime";
import { parseSecretsKeys } from "@coss/webhooks";
import { env } from "@/env";
import { planGate } from "./billing";

// One runtime per server process, kept across dev HMR re-evaluations.
const globalForSms = globalThis as unknown as { __cossSmsRuntime?: SmsRuntime };

export function smsRuntime(): SmsRuntime {
  globalForSms.__cossSmsRuntime ??= createSmsRuntime(env);
  return globalForSms.__cossSmsRuntime;
}

/** Whether numbers can be bought and registrations submitted here (not production on the fake). */
export function smsProvisioningEnabled(): boolean {
  return !(smsRuntime().provider === "fake" && process.env.NODE_ENV === "production");
}

/** What buying numbers and submitting registrations need: the provider, keys and plan limits. */
export function smsSenderDeps(): SmsSenderDeps {
  const runtime = smsRuntime();
  return {
    provider: runtime.provider,
    twilio: runtime.twilio,
    secretsKeys: parseSecretsKeys(env.WEBHOOK_SECRETS_KEY),
    subaccountPrefix: runtime.subaccountPrefix,
    callbackBaseUrl: env.API_PUBLIC_URL ?? "http://localhost:3001",
    plans: planGate(),
    provisioningDisabled: !smsProvisioningEnabled(),
  };
}
