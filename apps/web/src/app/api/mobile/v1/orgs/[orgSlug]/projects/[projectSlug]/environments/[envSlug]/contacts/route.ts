import type { ContactsResponse } from "@coss/companion";
import { contactCount, listContacts } from "@coss/email";
import { CONTACT_STATUSES, ListContactsQuery } from "@coss/email/contact-schemas";
import { cursorParam, mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { toMobileContactSummary } from "./wire";

export const dynamic = "force-dynamic";

// The dashboard's contacts/page.tsx.
const PAGE_SIZE = 50;

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/contacts">,
  ) => {
    const { scope } = await requireMobileEnvironment(request, await ctx.params, {
      contact: ["read"],
    });
    const search = new URL(request.url).searchParams;
    const email = search.get("email")?.trim() || undefined;
    const status = search.get("status");
    const query = ListContactsQuery.safeParse({
      email,
      status: CONTACT_STATUSES.includes(status as never) ? status : undefined,
      after: cursorParam(request),
      limit: PAGE_SIZE,
    });
    const [page, total] = await Promise.all([
      query.success ? listContacts(scope, query.data) : null,
      contactCount(scope),
    ]);
    return {
      data: page?.data.map(toMobileContactSummary) ?? [],
      next_cursor: page?.has_more ? (page.data.at(-1)?.id ?? null) : null,
      total,
      invalid_email: !query.success,
    } satisfies ContactsResponse;
  },
);
