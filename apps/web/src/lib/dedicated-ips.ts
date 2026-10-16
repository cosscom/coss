import "server-only";
import type { AddOnPreflight } from "@coss/billing";
import { organizationsBuyingAddOn } from "@coss/billing";
import { dedicatedIpCapacity, getDedicatedIpPool, MAX_DEDICATED_IP_POOLS } from "@coss/email";

/**
 * Refuses a Dedicated IPs purchase when every pool is taken (SES allows 50 per region; COSS keeps
 * `MAX_DEDICATED_IP_POOLS`), counting purchases still waiting for their payment. An organization
 * that still has a pool (e.g. one being released) keeps its slot.
 */
export const addOnPreflight: AddOnPreflight = async (organizationId, addOn) => {
  if (addOn.key !== "dedicated_ips") return [];
  if (await getDedicatedIpPool(organizationId)) return [];
  const [{ used }, buying] = await Promise.all([
    dedicatedIpCapacity(),
    organizationsBuyingAddOn("dedicated_ips"),
  ]);
  const others = buying.filter((id) => id !== organizationId).length;
  if (used + others < MAX_DEDICATED_IP_POOLS) return [];
  return ["Dedicated IPs are fully booked right now. Contact us and we'll set you up."];
};
