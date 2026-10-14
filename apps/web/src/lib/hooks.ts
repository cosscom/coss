import "server-only";
import type { HookManagementDeps } from "@coss/hooks";
import { env } from "@/env";
import { ActionError } from "@/lib/actions";
import { webhookManagementDeps } from "@/lib/webhooks";

/** Hooks endpoint management: the same secrets key ring as webhook endpoints. */
export function hookManagementDeps(): HookManagementDeps {
  return webhookManagementDeps();
}

/** Where portal session links point (`PORTAL_PUBLIC_URL`); unset until the portal is deployed. */
export function portalUrl(): string {
  if (!env.PORTAL_PUBLIC_URL) throw new ActionError("The portal isn't available yet.");
  return env.PORTAL_PUBLIC_URL;
}
