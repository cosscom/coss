import "server-only";
import { parseSecretsKey, type WebhookManagementDeps } from "@coss/webhooks";
import { env } from "@/env";

/** Endpoint management settings: the secrets key, and local URLs allowed outside production. */
export function webhookManagementDeps(): WebhookManagementDeps {
  return {
    secretsKey: parseSecretsKey(env.WEBHOOK_SECRETS_KEY),
    allowInsecureUrls: process.env.NODE_ENV !== "production",
  };
}
