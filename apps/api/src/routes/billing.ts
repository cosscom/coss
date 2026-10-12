import {
  billingObject,
  getInvoiceObject,
  listCreditPage,
  listInvoicePage,
  periodOf,
  usageSeries,
} from "@coss/billing";
import {
  BillingObject,
  CreditList,
  InvoiceList,
  InvoiceObject,
  ListCreditsQuery,
  ListInvoicesQuery,
  MAX_HOURLY_USAGE_RANGE_DAYS,
  MAX_USAGE_RANGE_DAYS,
  UsageList,
  UsageQuery,
} from "@coss/billing/wire";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import { ApiError, notFound } from "../errors.ts";
import { requireApiKey } from "../middleware/api-key.ts";
import { rateLimit } from "../middleware/rate-limit.ts";
import type { AppEnv } from "../types.ts";
import { commonErrors, errorDoc, jsonDoc } from "./docs.ts";

const DAY_MS = 24 * 60 * 60 * 1000;
// Organization-wide: every environment's key reads the same billing.
const middleware = [requireApiKey({ billing: ["read"] }), rateLimit("api.read")];

export const getBillingRoute = createRoute({
  method: "get",
  path: "/billing",
  operationId: "getBilling",
  tags: ["Billing"],
  summary: "Retrieve the organization's billing",
  description:
    "The organization's plan (and contract), the current billing month's usage and what it would " +
    "add to the next invoice so far, its standing (`past_due`, billing holds), payment method, and " +
    "what the plan includes. Organization-wide: every environment's key sees the same. Plan " +
    "changes are made in the dashboard; subscribe to the `billing.*` webhook events to follow them.",
  security: [{ bearerAuth: [] }],
  middleware,
  responses: {
    200: jsonDoc("The organization's billing.", BillingObject),
    ...commonErrors,
  },
});

export const listBillingUsageRoute = createRoute({
  method: "get",
  path: "/billing/usage",
  operationId: "listBillingUsage",
  tags: ["Billing"],
  summary: "List usage",
  description:
    "Billable usage over a range (the current billing month by default), per meter, dimension and " +
    "bucket (`hour`, `day` or `month`, UTC), oldest first; with `group_by=environment`, per " +
    "environment too. Only live environments are billed, so only they appear. Usage counts when it " +
    "becomes billable (an email when the provider accepts it) and is kept for " +
    `${MAX_USAGE_RANGE_DAYS} days.`,
  security: [{ bearerAuth: [] }],
  middleware,
  request: { query: UsageQuery },
  responses: {
    200: jsonDoc("Usage, oldest first.", UsageList),
    ...commonErrors,
    422: errorDoc(
      "A query parameter failed validation (`validation_error`), or the range is empty or too " +
        `long (\`invalid_range\`: at most ${MAX_USAGE_RANGE_DAYS} days, ${MAX_HOURLY_USAGE_RANGE_DAYS} by hour).`,
    ),
  },
});

export const listInvoicesRoute = createRoute({
  method: "get",
  path: "/billing/invoices",
  operationId: "listInvoices",
  tags: ["Billing"],
  summary: "List invoices",
  description:
    "The organization's invoices, newest first, without their lines. Pass the last `id` as " +
    "`after` to get the next page while `has_more` is true.",
  security: [{ bearerAuth: [] }],
  middleware,
  request: { query: ListInvoicesQuery },
  responses: {
    200: jsonDoc("A page of invoices.", InvoiceList),
    ...commonErrors,
    422: errorDoc("A query parameter failed validation (`validation_error`)."),
  },
});

const InvoiceIdParams = z.object({
  id: z.string().meta({
    description: "The invoice's id.",
    examples: ["inv_01k7c8m4q2f3e9v6t5r1n0p8yz"],
  }),
});

export const getInvoiceRoute = createRoute({
  method: "get",
  path: "/billing/invoices/{id}",
  operationId: "getInvoice",
  tags: ["Billing"],
  summary: "Retrieve an invoice",
  description: "One invoice with its lines.",
  security: [{ bearerAuth: [] }],
  middleware,
  request: { params: InvoiceIdParams },
  responses: {
    200: jsonDoc("The invoice.", InvoiceObject),
    ...commonErrors,
    404: errorDoc("No invoice with this id exists in the organization (`not_found`)."),
  },
});

export const listCreditsRoute = createRoute({
  method: "get",
  path: "/billing/credits",
  operationId: "listCredits",
  tags: ["Billing"],
  summary: "List credits",
  description:
    "The organization's credits, newest first: each month's plan credit, prepaid commitments and " +
    "credits from COSS support (in dollars, or free units of a product), with what's left. Only " +
    "usable ones by default (`status=all` for every one). Pass the last `id` as `after` to get the " +
    "next page while `has_more` is true.",
  security: [{ bearerAuth: [] }],
  middleware,
  request: { query: ListCreditsQuery },
  responses: {
    200: jsonDoc("A page of credits.", CreditList),
    ...commonErrors,
    422: errorDoc("A query parameter failed validation (`validation_error`)."),
  },
});

function invalidRange(): ApiError {
  return new ApiError(422, {
    type: "invalid_request_error",
    code: "invalid_range",
    message:
      `\`from\` must be before \`to\`, and the range at most ${MAX_USAGE_RANGE_DAYS} days long ` +
      `(${MAX_HOURLY_USAGE_RANGE_DAYS} by hour).`,
    param: "to",
  });
}

export function createBillingRoutes(): OpenAPIHono<AppEnv> {
  const router = new OpenAPIHono<AppEnv>();

  router.openapi(getBillingRoute, async (c) => {
    return c.json(await billingObject(c.var.auth.organizationId), 200);
  });

  router.openapi(listBillingUsageRoute, async (c) => {
    const query = c.req.valid("query");
    const now = new Date();
    const start = query.from ? new Date(query.from) : periodOf(now).start;
    const end = query.to ? new Date(query.to) : now;
    const granularity = query.granularity ?? "day";
    const days = (end.getTime() - start.getTime()) / DAY_MS;
    const max = granularity === "hour" ? MAX_HOURLY_USAGE_RANGE_DAYS : MAX_USAGE_RANGE_DAYS;
    if (!(end > start) || days > max) throw invalidRange();
    const data = await usageSeries(c.var.auth.organizationId, {
      interval: { start, end },
      granularity,
      byEnvironment: query.group_by === "environment",
      meter: query.meter,
    });
    return c.json({ object: "list" as const, data, has_more: false as const }, 200);
  });

  router.openapi(listInvoicesRoute, async (c) => {
    const query = c.req.valid("query");
    const page = await listInvoicePage(c.var.auth.organizationId, query);
    return c.json({ object: "list" as const, data: page.data, has_more: page.hasMore }, 200);
  });

  router.openapi(getInvoiceRoute, async (c) => {
    const { id } = c.req.valid("param");
    const invoice = await getInvoiceObject(c.var.auth.organizationId, id);
    if (!invoice) throw notFound("No invoice with this id exists in the organization.");
    return c.json(invoice, 200);
  });

  router.openapi(listCreditsRoute, async (c) => {
    const query = c.req.valid("query");
    const page = await listCreditPage(c.var.auth.organizationId, query);
    return c.json({ object: "list" as const, data: page.data, has_more: page.hasMore }, 200);
  });

  return router;
}
