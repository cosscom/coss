import "server-only";
import { parseSecretsKeys, type WebhookManagementDeps } from "@coss/webhooks";
import { env } from "@/env";
import { planGate } from "./billing";

/**
 * Endpoint management settings: the secrets key, local URLs allowed outside production, and the
 * organization's plan (endpoints per environment, log drains).
 */
export function webhookManagementDeps(): WebhookManagementDeps {
  return {
    secretsKeys: parseSecretsKeys(env.WEBHOOK_SECRETS_KEY),
    allowInsecureUrls: process.env.NODE_ENV !== "production",
    plans: planGate(),
  };
}
