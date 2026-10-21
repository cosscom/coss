import type { ContactResponse } from "@coss/companion";
import {
  contactAudienceIds,
  getContactRow,
  getContactTopics,
  listContactPropertyRows,
  toContactObject,
} from "@coss/email";
import { MobileApiError, mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { listEveryAudience, toMobileContact } from "../wire";

export const dynamic = "force-dynamic";

// The dashboard's contacts/[contactId]/page.tsx.
export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/contacts/[contactId]">,
  ) => {
    const { contactId, ...params } = await ctx.params;
    const { scope } = await requireMobileEnvironment(request, params, { contact: ["read"] });
    const row = await getContactRow(scope, contactId);
    if (!row) throw new MobileApiError(404, "not_found", "Contact not found.");
    const contact = toContactObject(row);
    const [definitions, topics, audiences, memberships] = await Promise.all([
      listContactPropertyRows(scope),
      getContactTopics(scope, contact.id),
      listEveryAudience(scope),
      contactAudienceIds(scope, contact.id),
    ]);
    return {
      contact: toMobileContact(contact),
      properties: definitions.map((definition) => ({
        key: definition.key,
        type: definition.type,
        value: Object.hasOwn(contact.properties, definition.key)
          ? (contact.properties[definition.key] ?? null)
          : null,
      })),
      topics: (topics?.topics ?? []).map((topic) => ({
        topic: topic.topic,
        name: topic.name,
        choice: topic.choice,
        subscribed: topic.subscribed,
      })),
      audiences: audiences.map((audience) => ({
        id: audience.id,
        name: audience.name,
        member: memberships.has(audience.id),
      })),
    } satisfies ContactResponse;
  },
);
