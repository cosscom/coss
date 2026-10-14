import "server-only";
import type { HookManagementDeps } from "@coss/hooks";
import { env } from "@/env";
import { webhookManagementDeps } from "@/lib/webhooks";

/** Hooks endpoint management: the same secrets key ring as webhook endpoints. */
export function hookManagementDeps(): HookManagementDeps {
  return webhookManagementDeps();
}

/** Where portal session links point (`PORTAL_PUBLIC_URL`). */
export function portalUrl(): string {
  return env.PORTAL_PUBLIC_URL;
}
