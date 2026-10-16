import "server-only";
import { getEnvironmentById } from "@coss/tenancy";
import { env } from "@/env";

export const SYSTEM_ORGANIZATION_MESSAGE =
  "This is coss.com's own organization (it sends account emails), so it can't be suspended.";

/**
 * Whether this is coss.com's own organization: the one whose live environment
 * (`NOTIFICATIONS_ENVIRONMENT_ID`) sends account and notification emails. Nobody suspends it,
 * admins included: that would stop every sign-up verification, password reset and invitation
 * email (the worker never does it either).
 */
export async function isSystemOrganization(organizationId: string): Promise<boolean> {
  const environmentId = env.NOTIFICATIONS_ENVIRONMENT_ID;
  if (!environmentId) return false;
  return (await getEnvironmentById({ organizationId, environmentId })) !== null;
}
