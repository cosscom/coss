import "server-only";
import type { AddOnPreflight } from "@coss/billing";
import { organizationsBuyingAddOn, organizationsEntitledTo } from "@coss/billing";
import { dedicatedIpSlotAvailable } from "@coss/email";

/**
 * Refuses a Dedicated IPs purchase when every pool is taken (SES allows 50 per region; COSS keeps
 * `MAX_DEDICATED_IP_POOLS`): pools, organizations already entitled (a paid purchase the worker
 * hasn't provisioned yet) and purchases still waiting for their payment each hold a slot.
 */
export const addOnPreflight: AddOnPreflight = async (tx, organizationId, addOn, now) => {
  if (addOn.key !== "dedicated_ips") return [];
  const available = await dedicatedIpSlotAvailable(tx, organizationId, async () => [
    ...(await organizationsEntitledTo("dedicatedIps", { now }, tx)),
    ...(await organizationsBuyingAddOn("dedicated_ips", now, tx)),
  ]);
  return available
    ? []
    : ["Dedicated IPs are fully booked right now. Contact us and we'll set you up."];
};
