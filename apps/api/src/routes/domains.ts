import {
  checkDomain,
  createDomain,
  type DomainDeps,
  type DomainRow,
  deleteDomain,
  getDomain,
  listDomains,
  MAX_PENDING_DOMAINS,
  restartDomainVerification,
  toDomainObject,
} from "@coss/email";
import { CreateDomainRequest, DeletedDomain, DomainList, DomainObject } from "@coss/email/schemas";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import { recordApiAudit } from "../audit.ts";
import { ApiError, notFound } from "../errors.ts";
import { requireApiKey } from "../middleware/api-key.ts";
import { upgradeRequestBody } from "../middleware/api-version.ts";
import { rateLimit } from "../middleware/rate-limit.ts";
import type { AppEnv } from "../types.ts";
import { commonErrors, errorDoc, jsonDoc } from "./docs.ts";

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
    413: errorDoc("The request body is larger than 5 MB (`payload_too_large`)."),
    415: errorDoc("The body is not sent as `application/json` (`unsupported_media_type`)."),
    422: errorDoc(
      "The body failed validation (`validation_error`), the name is not a usable domain " +
        "(`invalid_domain`), it is already in use here or by another account (`domain_taken`), " +
        `or ${PENDING_LIMIT} (\`too_many_pending_domains\`).`,
    ),
    502: errorDoc("The delivery provider could not set the domain up; retry (`provider_error`)."),
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
  responses: {
    200: jsonDoc("The organization's domains.", DomainList),
    ...commonErrors,
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
    "over with fresh DKIM records, which have to be published again.",
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
    502: errorDoc("The delivery provider could not remove the domain; retry (`provider_error`)."),
  },
});

export function createDomainRoutes(deps: DomainDeps): OpenAPIHono<AppEnv> {
  const router = new OpenAPIHono<AppEnv>();

  /** The domain addressed by the path, inside the key's organization. */
  async function requireDomain(organizationId: string, id: string): Promise<DomainRow> {
    // Malformed, unknown and other-organization ids are all `null`.
    const row = await getDomain({ organizationId, id });
    if (!row) throw notFound("No domain with this id exists in this organization.");
    return row;
  }

  router.openapi(createDomainRoute, async (c) => {
    const { name } = c.req.valid("json");
    // Tenancy always comes from the authenticated key, never from the request. There is no user
    // behind an API key, so the domain records no creator.
    const row = await createDomain(
      { organizationId: c.var.auth.organizationId, name, userId: null },
      deps,
    );
    await recordApiAudit(c, {
      action: "domain.created",
      target: { type: "domain", id: row.id, label: row.name },
      environmentScoped: false,
    });
    return c.json(toDomainObject(row), 200);
  });

  router.openapi(listDomainsRoute, async (c) => {
    const rows = await listDomains({ organizationId: c.var.auth.organizationId });
    return c.json(
      { object: "list" as const, data: rows.map(toDomainObject), has_more: false },
      200,
    );
  });

  router.openapi(getDomainRoute, async (c) => {
    const { id } = c.req.valid("param");
    const row = await requireDomain(c.var.auth.organizationId, id);
    return c.json(toDomainObject(row), 200);
  });

  router.openapi(verifyDomainRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { organizationId } = c.var.auth;
    const row = await requireDomain(organizationId, id);
    if (row.status === "failed") {
      const restarted = await restartDomainVerification({ organizationId, id: row.id }, deps);
      return c.json(toDomainObject(restarted), 200);
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
    return c.json(toDomainObject(checked), 200);
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

  return router;
}
