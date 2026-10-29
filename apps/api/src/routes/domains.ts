import {
  checkDomain,
  checkReceivingDomain,
  createDomain,
  createReceivingDomain,
  createTrackingDomain,
  type DomainDeps,
  DomainError,
  type DomainRow,
  deleteDomain,
  deleteReceivingDomain,
  deleteTrackingDomain,
  dmarcOverview,
  domainObject,
  domainObjects,
  findSubaccount,
  getDmarcReport,
  getDomain,
  getReceivingDomain,
  listDmarcReports,
  listDomains,
  MAX_PENDING_DOMAINS,
  MAX_SUBACCOUNT_DOMAINS,
  restartDomainVerification,
  setDomainSharedWithSubaccounts,
  verifyTrackingDomain,
} from "@coss/email";
import type { InboundRuntime } from "@coss/email/runtime";
import {
  CreateDomainRequest,
  CreateReceivingDomainRequest,
  CreateTrackingDomainRequest,
  DEFAULT_DMARC_REPORT_LIST_LIMIT,
  DeletedDomain,
  DmarcReportList,
  DmarcReportObject,
  DomainDmarc,
  DomainList,
  DomainObject,
  ListDmarcReportsQuery,
  ListDomainsQuery,
  UpdateDomainRequest,
} from "@coss/email/schemas";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import { recordApiAudit } from "../audit.ts";
import { ApiError, notFound } from "../errors.ts";
import { requireApiKey } from "../middleware/api-key.ts";
import { upgradeRequestBody } from "../middleware/api-version.ts";
import { rateLimit } from "../middleware/rate-limit.ts";
import type { AppEnv } from "../types.ts";
import { billingErrorDoc, commonErrors, errorDoc, jsonDoc } from "./docs.ts";

/** A manual verify waits at least this long after the previous check (as the dashboard does). */
export const MANUAL_CHECK_INTERVAL_MS = 10_000;

const DomainIdParams = z.object({
  id: z
    .string()
    .meta({ description: "The domain's id.", examples: ["dom_01k7c8m4q2f3e9v6t5r1n0p8yz"] }),
});

const SCOPE_NOTE =
  "Domains belong to the organization, not to one environment, so every API key of the " +
  "organization sees the same domains.";

const PENDING_LIMIT = `The organization already has ${MAX_PENDING_DOMAINS} domains awaiting verification`;

const domainNotFound = errorDoc(
  "No domain with this id exists in this organization (`not_found`).",
);

export const createDomainRoute = createRoute({
  method: "post",
  path: "/domains",
  operationId: "createDomain",
  tags: ["Domains"],
  summary: "Add a sending domain",
  description:
    `Claims the domain for the organization and returns the DNS records to publish. ${SCOPE_NOTE} ` +
    "The records are checked repeatedly in the background and verification gives up after 72 " +
    "hours; until the domain is `verified`, live keys cannot send from it.",
  security: [{ bearerAuth: [] }],
  middleware: [
    requireApiKey({ domain: ["create"] }),
    rateLimit("api.write"),
    upgradeRequestBody("POST /v1/domains"),
  ],
  request: {
    body: { required: true, content: { "application/json": { schema: CreateDomainRequest } } },
  },
  responses: {
    200: jsonDoc("The domain, with the DNS records to publish.", DomainObject),
    400: errorDoc("The body is not valid JSON (`invalid_json`)."),
    ...commonErrors,
    402: billingErrorDoc("The organization's plan allows no more domains (`plan_limit_reached`)"),
    413: errorDoc("The request body is larger than 5 MB (`payload_too_large`)."),
    415: errorDoc("The body is not sent as `application/json` (`unsupported_media_type`)."),
    422: errorDoc(
      "The body failed validation (`validation_error`), the name is not a usable domain " +
        "(`invalid_domain`), it is already in use here or by another account (`domain_taken`), " +
        `or ${PENDING_LIMIT} (\`too_many_pending_domains\`). For a sub-account: it doesn't exist ` +
        "in the API key's environment (`subaccount_not_found`), isn't live " +
        "(`subaccount_not_live`), or has " +
        `${MAX_SUBACCOUNT_DOMAINS} domains already (\`too_many_subaccount_domains\`).`,
    ),
    502: errorDoc("The delivery provider could not set the domain up; retry (`provider_error`)."),
  },
});

export const updateDomainRoute = createRoute({
  method: "patch",
  path: "/domains/{id}",
  operationId: "updateDomain",
  tags: ["Domains"],
  summary: "Update a sending domain",
  description:
    "Shares one of the organization's own domains with its sub-accounts (they may then send from " +
    "it, through the organization's reputation), or stops sharing it.",
  security: [{ bearerAuth: [] }],
  middleware: [
    requireApiKey({ domain: ["create"] }),
    rateLimit("api.write"),
    upgradeRequestBody("PATCH /v1/domains/{id}"),
  ],
  request: {
    params: DomainIdParams,
    body: { required: true, content: { "application/json": { schema: UpdateDomainRequest } } },
  },
  responses: {
    200: jsonDoc("The domain.", DomainObject),
    400: errorDoc("The body is not valid JSON (`invalid_json`)."),
    ...commonErrors,
    404: domainNotFound,
    413: errorDoc("The request body is larger than 5 MB (`payload_too_large`)."),
    415: errorDoc("The body is not sent as `application/json` (`unsupported_media_type`)."),
    422: errorDoc(
      "The body failed validation (`validation_error`), or the domain is a sub-account's (`not_shareable`).",
    ),
  },
});

export const listDomainsRoute = createRoute({
  method: "get",
  path: "/domains",
  operationId: "listDomains",
  tags: ["Domains"],
  summary: "List sending domains",
  description: `Every domain of the organization, ordered by name. ${SCOPE_NOTE}`,
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ domain: ["read"] }), rateLimit("api.read")],
  request: { query: ListDomainsQuery },
  responses: {
    200: jsonDoc("The organization's domains.", DomainList),
    ...commonErrors,
    422: errorDoc(
      "`subaccount` names no sub-account of the API key's environment (`subaccount_not_found`).",
    ),
  },
});

export const getDomainRoute = createRoute({
  method: "get",
  path: "/domains/{id}",
  operationId: "getDomain",
  tags: ["Domains"],
  summary: "Retrieve a sending domain",
  description:
    "The domain with the result of the last DNS check, so you can show which records are still " +
    "missing or mismatched.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ domain: ["read"] }), rateLimit("api.read")],
  request: { params: DomainIdParams },
  responses: {
    200: jsonDoc("The domain.", DomainObject),
    ...commonErrors,
    404: domainNotFound,
  },
});

export const verifyDomainRoute = createRoute({
  method: "post",
  path: "/domains/{id}/verify",
  operationId: "verifyDomain",
  tags: ["Domains"],
  summary: "Check a domain's DNS records now",
  description:
    "Asks the delivery provider and DNS about the domain immediately instead of waiting for the " +
    "next background check, and returns the updated domain. A `failed` domain starts verification " +
    "over with fresh DKIM records, which have to be published again. Its tracking domain, if " +
    "any, is checked too (and set up again if it `failed`).",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ domain: ["verify"] }), rateLimit("api.write")],
  request: { params: DomainIdParams },
  responses: {
    200: jsonDoc("The domain, as the check left it.", DomainObject),
    ...commonErrors,
    404: domainNotFound,
    422: errorDoc(
      `${PENDING_LIMIT}, so a \`failed\` one cannot restart (\`too_many_pending_domains\`).`,
    ),
    429: errorDoc(
      "The domain was checked moments ago (`domain_recently_checked`), or too many requests " +
        "with this API key (`rate_limited`). Retry after `Retry-After` seconds, or just read " +
        "the domain.",
      { "Retry-After": { description: "Seconds to wait.", schema: { type: "integer" } } },
    ),
    502: errorDoc("The delivery provider could not be reached; retry (`provider_error`)."),
  },
});

export const deleteDomainRoute = createRoute({
  method: "delete",
  path: "/domains/{id}",
  operationId: "deleteDomain",
  tags: ["Domains"],
  summary: "Remove a sending domain",
  description:
    "Removes the domain and its provider identity. Emails already sent are unaffected, but live " +
    "keys can no longer send from it and the name becomes available again.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ domain: ["delete"] }), rateLimit("api.write")],
  request: { params: DomainIdParams },
  responses: {
    200: jsonDoc("The domain was removed.", DeletedDomain),
    ...commonErrors,
    404: domainNotFound,
    422: errorDoc(
      "The organization's single sign-on uses the domain (`domain_in_use_by_sso`): remove it " +
        "from the SSO provider in the dashboard first.",
    ),
    502: errorDoc("The delivery provider could not remove the domain; retry (`provider_error`)."),
  },
});

const TRACKING_NOTE =
  "Open pixels and click redirects of emails sent from the domain (or its subdomains without a " +
  "domain of their own) use the tracking domain while it is `active`, and the default tracking " +
  "host otherwise.";

export const createTrackingDomainRoute = createRoute({
  method: "post",
  path: "/domains/{id}/tracking",
  operationId: "createTrackingDomain",
  tags: ["Domains"],
  summary: "Add a custom tracking domain",
  description:
    "Sets up a subdomain of the domain (e.g. `links.acme.com`) to serve open and click tracking. " +
    "Publish the CNAME record in `tracking.record`; coss.com then issues its certificate and checks " +
    `it in the background, giving up after 72 hours. ${TRACKING_NOTE} A domain has at most one ` +
    "tracking domain: remove it to use another hostname.",
  security: [{ bearerAuth: [] }],
  middleware: [
    requireApiKey({ domain: ["create"] }),
    rateLimit("api.write"),
    upgradeRequestBody("POST /v1/domains/{id}/tracking"),
  ],
  request: {
    params: DomainIdParams,
    body: {
      required: true,
      content: { "application/json": { schema: CreateTrackingDomainRequest } },
    },
  },
  responses: {
    200: jsonDoc("The domain, with its tracking domain and the CNAME to publish.", DomainObject),
    400: errorDoc("The body is not valid JSON (`invalid_json`)."),
    ...commonErrors,
    402: billingErrorDoc(
      "The organization's plan doesn't include custom tracking domains (`plan_feature_unavailable`)",
    ),
    404: domainNotFound,
    413: errorDoc("The request body is larger than 5 MB (`payload_too_large`)."),
    415: errorDoc("The body is not sent as `application/json` (`unsupported_media_type`)."),
    422: errorDoc(
      "The body failed validation (`validation_error`), the hostname is not a subdomain of the " +
        "domain it can use (`invalid_tracking_hostname`), the domain already has a tracking " +
        "domain (`tracking_domain_exists`), or the hostname is already in use " +
        "(`tracking_domain_taken`).",
    ),
    502: errorDoc(
      "The certificate provider could not set the hostname up; retry (`provider_error`).",
    ),
  },
});

export const deleteTrackingDomainRoute = createRoute({
  method: "delete",
  path: "/domains/{id}/tracking",
  operationId: "deleteTrackingDomain",
  tags: ["Domains"],
  summary: "Remove a custom tracking domain",
  description:
    "Removes the domain's tracking domain. Later emails use the default tracking host, but links " +
    "and open pixels in emails already sent through the tracking domain stop working.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ domain: ["delete"] }), rateLimit("api.write")],
  request: { params: DomainIdParams },
  responses: {
    200: jsonDoc("The domain, without a tracking domain.", DomainObject),
    ...commonErrors,
    404: errorDoc(
      "No domain with this id exists in this organization, or it has no tracking domain " +
        "(`not_found`).",
    ),
    502: errorDoc(
      "The certificate provider could not remove the hostname; retry (`provider_error`).",
    ),
  },
});

export const createReceivingDomainRoute = createRoute({
  method: "post",
  path: "/domains/{id}/receiving",
  operationId: "createReceivingDomain",
  tags: ["Domains"],
  summary: "Receive email at a domain",
  description:
    "Starts receiving email at the domain itself or a subdomain (e.g. `inbound.acme.com`): email " +
    "sent to any address at that hostname becomes a received email of the API key's environment " +
    "(an `email.received` webhook, `GET /v1/received_emails`). Publish the MX record in " +
    "`receiving.record`; coss.com checks it in the background. Using the domain itself moves all of " +
    "its mail to coss.com. A domain has at most one receiving hostname: remove it to use another one.",
  security: [{ bearerAuth: [] }],
  middleware: [
    requireApiKey({ domain: ["create"] }),
    rateLimit("api.write"),
    upgradeRequestBody("POST /v1/domains/{id}/receiving"),
  ],
  request: {
    params: DomainIdParams,
    body: {
      required: true,
      content: { "application/json": { schema: CreateReceivingDomainRequest } },
    },
  },
  responses: {
    200: jsonDoc(
      "The domain, with its receiving domain and the MX record to publish.",
      DomainObject,
    ),
    400: errorDoc("The body is not valid JSON (`invalid_json`)."),
    ...commonErrors,
    404: domainNotFound,
    413: errorDoc("The request body is larger than 5 MB (`payload_too_large`)."),
    415: errorDoc("The body is not sent as `application/json` (`unsupported_media_type`)."),
    422: errorDoc(
      "The body failed validation (`validation_error`), the hostname is not one the domain can " +
        "receive at (`invalid_receiving_hostname`), the domain already receives email " +
        "(`receiving_domain_exists`), the hostname is already in use " +
        "(`receiving_domain_taken`), or this deployment does not receive email " +
        "(`receiving_unavailable`).",
    ),
  },
});

export const deleteReceivingDomainRoute = createRoute({
  method: "delete",
  path: "/domains/{id}/receiving",
  operationId: "deleteReceivingDomain",
  tags: ["Domains"],
  summary: "Stop receiving email at a domain",
  description:
    "Stops receiving at the domain's receiving hostname: later mail to it is dropped (remove the " +
    "MX record too). Emails already received stay until their retention ends.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ domain: ["delete"] }), rateLimit("api.write")],
  request: { params: DomainIdParams },
  responses: {
    200: jsonDoc("The domain, without a receiving domain.", DomainObject),
    ...commonErrors,
    404: errorDoc(
      "No domain with this id exists in this organization, or it does not receive email " +
        "(`not_found`).",
    ),
  },
});

const DMARC_NOTE =
  "Mailbox providers send DMARC aggregate reports to the domain's `report_address` once its " +
  "`_dmarc` record names it (`rua=mailto:…`), usually once a day each.";

export const getDomainDmarcRoute = createRoute({
  method: "get",
  path: "/domains/{id}/dmarc",
  operationId: "getDomainDmarc",
  tags: ["Domains"],
  summary: "Retrieve a domain's DMARC status",
  description:
    "The domain's published DMARC record, where it is on the path from `p=none` to `p=reject`, " +
    "the record to publish next and whether the last 14 days of aggregate reports say that is " +
    `safe (\`ready\`, with the \`checks\` behind it), and a summary of those reports. ${DMARC_NOTE}`,
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ domain: ["read"] }), rateLimit("api.read")],
  request: { params: DomainIdParams },
  responses: {
    200: jsonDoc("The domain's DMARC status.", DomainDmarc),
    ...commonErrors,
    404: domainNotFound,
  },
});

export const listDomainDmarcReportsRoute = createRoute({
  method: "get",
  path: "/domains/{id}/dmarc/reports",
  operationId: "listDomainDmarcReports",
  tags: ["Domains"],
  summary: "List a domain's DMARC reports",
  description:
    "The aggregate reports received about the domain, newest first, without their rows " +
    "(retrieve one for those). Pass the last `id` as `after` to get the next page while " +
    `\`has_more\` is true. ${DMARC_NOTE}`,
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ domain: ["read"] }), rateLimit("api.read")],
  request: { params: DomainIdParams, query: ListDmarcReportsQuery },
  responses: {
    200: jsonDoc("A page of DMARC reports.", DmarcReportList),
    ...commonErrors,
    404: domainNotFound,
    422: errorDoc("A query parameter failed validation (`validation_error`)."),
  },
});

export const getDomainDmarcReportRoute = createRoute({
  method: "get",
  path: "/domains/{id}/dmarc/reports/{report_id}",
  operationId: "getDomainDmarcReport",
  tags: ["Domains"],
  summary: "Retrieve a DMARC report",
  description:
    "One aggregate report with its rows: each source IP, how many messages it sent, whether " +
    "they passed DMARC (aligned DKIM or SPF) and what the receiver did with them.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ domain: ["read"] }), rateLimit("api.read")],
  request: {
    params: DomainIdParams.extend({
      report_id: z.string().meta({
        description: "The report's id.",
        examples: ["dmarcrep_01k7c8m4q2f3e9v6t5r1n0p8yz"],
      }),
    }),
  },
  responses: {
    200: jsonDoc("The report.", DmarcReportObject),
    ...commonErrors,
    404: errorDoc("No such domain in this organization, or no such report of it (`not_found`)."),
  },
});

export function createDomainRoutes(
  deps: DomainDeps,
  inbound: InboundRuntime | null,
): OpenAPIHono<AppEnv> {
  const router = new OpenAPIHono<AppEnv>();
  // DMARC reports arrive through receiving, at the managed inbound domain.
  const dmarcReportDomain = deps.dmarcReportDomain ?? inbound?.managedDomain ?? null;

  /** The domain addressed by the path, inside the key's organization. */
  async function requireDomain(organizationId: string, id: string): Promise<DomainRow> {
    // Malformed, unknown and other-organization ids are all `null`.
    const row = await getDomain({ organizationId, id });
    if (!row) throw notFound("No domain with this id exists in this organization.");
    return row;
  }

  /** The sub-account a body or query names, in the key's environment (a field at fault: 422). */
  async function namedSubaccount(
    auth: AppEnv["Variables"]["auth"],
    ref: string | undefined,
  ): Promise<string | undefined> {
    if (ref === undefined) return undefined;
    const row = await findSubaccount({
      organizationId: auth.organizationId,
      environmentId: auth.environmentId,
      ref,
    });
    if (!row || row.status === "deleting") {
      throw new DomainError("subaccount_not_found", `No sub-account "${ref}" exists here.`);
    }
    return row.id;
  }

  router.openapi(createDomainRoute, async (c) => {
    const { name, subaccount } = c.req.valid("json");
    const subaccountId = await namedSubaccount(c.var.auth, subaccount);
    // Tenancy always comes from the authenticated key, never from the request. There is no user
    // behind an API key, so the domain records no creator.
    const row = await createDomain(
      { organizationId: c.var.auth.organizationId, name, userId: null, subaccountId },
      deps,
    );
    await recordApiAudit(c, {
      action: "domain.created",
      target: { type: "domain", id: row.id, label: row.name },
      environmentScoped: false,
      ...(subaccountId && { metadata: { subaccount_id: subaccountId } }),
    });
    return c.json(await domainObject(row, dmarcReportDomain), 200);
  });

  router.openapi(updateDomainRoute, async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const existing = await requireDomain(c.var.auth.organizationId, id);
    const row = await setDomainSharedWithSubaccounts({
      organizationId: existing.organizationId,
      id: existing.id,
      shared: body.shared_with_subaccounts,
    });
    if (existing.sharedWithSubaccounts !== row.sharedWithSubaccounts) {
      await recordApiAudit(c, {
        action: "domain.updated",
        target: { type: "domain", id: row.id, label: row.name },
        environmentScoped: false,
        metadata: { shared_with_subaccounts: row.sharedWithSubaccounts },
      });
    }
    return c.json(await domainObject(row, dmarcReportDomain), 200);
  });

  router.openapi(listDomainsRoute, async (c) => {
    const { organizationId } = c.var.auth;
    const query = c.req.valid("query");
    const rows = await listDomains({
      organizationId,
      subaccountId: await namedSubaccount(c.var.auth, query.subaccount),
    });
    return c.json(
      {
        object: "list" as const,
        data: await domainObjects(organizationId, rows, dmarcReportDomain),
        has_more: false,
      },
      200,
    );
  });

  router.openapi(getDomainRoute, async (c) => {
    const { id } = c.req.valid("param");
    const row = await requireDomain(c.var.auth.organizationId, id);
    return c.json(await domainObject(row, dmarcReportDomain), 200);
  });

  /**
   * Checks the domain's tracking and receiving domains along with it; their own problems show on
   * their objects.
   */
  async function verifyTracking(organizationId: string, domainId: string): Promise<void> {
    try {
      await verifyTrackingDomain({ organizationId, domainId }, deps);
    } catch (error) {
      console.error(`[api:domains] checking the tracking domain of ${domainId} failed:`, error);
    }
    if (!inbound || !(await getReceivingDomain({ organizationId, domainId }))) return;
    try {
      await checkReceivingDomain({ organizationId, domainId }, inbound, deps.dns);
    } catch (error) {
      console.error(`[api:domains] checking the receiving domain of ${domainId} failed:`, error);
    }
  }

  router.openapi(verifyDomainRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { organizationId } = c.var.auth;
    const row = await requireDomain(organizationId, id);
    if (row.status === "failed") {
      const restarted = await restartDomainVerification({ organizationId, id: row.id }, deps);
      await verifyTracking(organizationId, row.id);
      return c.json(await domainObject(restarted, dmarcReportDomain), 200);
    }
    // One provider and DNS round trip per domain every few seconds is enough; the background
    // re-check keeps running either way.
    const since = row.lastCheckedAt ? Date.now() - row.lastCheckedAt.getTime() : Infinity;
    if (since < MANUAL_CHECK_INTERVAL_MS) {
      throw new ApiError(
        429,
        {
          type: "rate_limit_error",
          code: "domain_recently_checked",
          message: "This domain was checked moments ago. Try again in a few seconds.",
        },
        { "Retry-After": String(Math.ceil((MANUAL_CHECK_INTERVAL_MS - since) / 1000)) },
      );
    }
    const checked = await checkDomain({ organizationId, id: row.id }, deps);
    await verifyTracking(organizationId, row.id);
    return c.json(await domainObject(checked, dmarcReportDomain), 200);
  });

  router.openapi(deleteDomainRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { organizationId } = c.var.auth;
    const row = await requireDomain(organizationId, id);
    await deleteDomain({ organizationId, id: row.id }, deps);
    await recordApiAudit(c, {
      action: "domain.deleted",
      target: { type: "domain", id: row.id, label: row.name },
      environmentScoped: false,
    });
    return c.json({ object: "domain" as const, id: row.id, deleted: true as const }, 200);
  });

  router.openapi(createTrackingDomainRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { hostname } = c.req.valid("json");
    const { organizationId } = c.var.auth;
    const row = await requireDomain(organizationId, id);
    await createTrackingDomain({ organizationId, domainId: row.id, hostname }, deps);
    await recordApiAudit(c, {
      action: "tracking_domain.created",
      target: { type: "domain", id: row.id, label: row.name },
      environmentScoped: false,
      metadata: { hostname },
    });
    return c.json(await domainObject(row, dmarcReportDomain), 200);
  });

  router.openapi(deleteTrackingDomainRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { organizationId } = c.var.auth;
    const row = await requireDomain(organizationId, id);
    await deleteTrackingDomain({ organizationId, domainId: row.id }, deps);
    await recordApiAudit(c, {
      action: "tracking_domain.deleted",
      target: { type: "domain", id: row.id, label: row.name },
      environmentScoped: false,
    });
    return c.json(await domainObject(row, dmarcReportDomain), 200);
  });

  router.openapi(createReceivingDomainRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { hostname } = c.req.valid("json");
    const { organizationId, environmentId } = c.var.auth;
    if (!inbound) {
      throw new ApiError(422, {
        type: "invalid_request_error",
        code: "receiving_unavailable",
        message: "This deployment does not receive email.",
      });
    }
    const row = await requireDomain(organizationId, id);
    // The key's environment receives: tenancy comes from the key, never from the request.
    const created = await createReceivingDomain(
      { organizationId, domainId: row.id, environmentId, hostname },
      inbound,
      deps.dns,
    );
    await recordApiAudit(c, {
      action: "domain.receiving_enabled",
      target: { type: "domain", id: row.id, label: row.name },
      metadata: { hostname: created.hostname },
    });
    return c.json(await domainObject(row, dmarcReportDomain), 200);
  });

  router.openapi(deleteReceivingDomainRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { organizationId } = c.var.auth;
    const row = await requireDomain(organizationId, id);
    const removed = await deleteReceivingDomain({ organizationId, domainId: row.id });
    await recordApiAudit(c, {
      action: "domain.receiving_disabled",
      target: { type: "domain", id: row.id, label: row.name },
      environmentScoped: false,
      metadata: { hostname: removed.hostname },
    });
    return c.json(await domainObject(row, dmarcReportDomain), 200);
  });

  router.openapi(getDomainDmarcRoute, async (c) => {
    const { id } = c.req.valid("param");
    const row = await requireDomain(c.var.auth.organizationId, id);
    return c.json(await dmarcOverview(row, dmarcReportDomain), 200);
  });

  router.openapi(listDomainDmarcReportsRoute, async (c) => {
    const { id } = c.req.valid("param");
    const query = c.req.valid("query");
    const { organizationId } = c.var.auth;
    const row = await requireDomain(organizationId, id);
    const page = await listDmarcReports({
      organizationId,
      domainId: row.id,
      limit: query.limit ?? DEFAULT_DMARC_REPORT_LIST_LIMIT,
      after: query.after,
    });
    return c.json({ object: "list" as const, data: page.data, has_more: page.hasMore }, 200);
  });

  router.openapi(getDomainDmarcReportRoute, async (c) => {
    const { id, report_id: reportId } = c.req.valid("param");
    const { organizationId } = c.var.auth;
    const row = await requireDomain(organizationId, id);
    const report = await getDmarcReport({ organizationId, domainId: row.id, id: reportId });
    if (!report) throw notFound("No DMARC report with this id exists for this domain.");
    return c.json(report, 200);
  });

  return router;
}
