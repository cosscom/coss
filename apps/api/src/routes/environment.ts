import { getApiKeyEnvironmentSummary } from "@coss/tenancy";
import { LATEST_API_VERSION } from "@coss/versioning";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import { ApiError } from "../errors.ts";
import { requireApiKey } from "../middleware/api-key.ts";
import { rateLimit } from "../middleware/rate-limit.ts";
import type { AppEnv } from "../types.ts";
import { commonErrors, jsonDoc } from "./docs.ts";

const Named = (what: string) =>
  z.strictObject({
    id: z.string().meta({ description: `The ${what}'s id.` }),
    name: z.string().meta({ description: `The ${what}'s name.` }),
    slug: z.string().meta({ description: `The ${what}'s slug, as in dashboard URLs.` }),
  });

export const EnvironmentObject = z
  .strictObject({
    object: z.literal("environment"),
    id: z.string().meta({ description: "The environment's id." }),
    name: z.string(),
    slug: z.string(),
    mode: z.enum(["live", "sandbox"]).meta({
      description: "`live` delivers email; `sandbox` (`coss_test_` keys) never does.",
    }),
    project: Named("project"),
    organization: Named("organization").extend({
      api_version: z.string().meta({
        description:
          "The organization's pinned API version: what requests without a `Coss-Version` header " +
          "and new webhook endpoints get.",
      }),
    }),
    api_key: z
      .strictObject({
        id: z.string().meta({ description: "The key's id." }),
        name: z.string().nullable(),
        start: z
          .string()
          .nullable()
          .meta({ description: "The key's first characters, as shown in the dashboard." }),
      })
      .meta({ description: "The API key making this request." }),
  })
  .meta({
    id: "Environment",
    description: "The environment an API key belongs to, with its project and organization.",
    examples: [
      {
        object: "environment",
        id: "env_01k7c8m4q2f3e9v6t5r1n0p8yz",
        name: "Development",
        slug: "development",
        mode: "sandbox",
        project: { id: "proj_01k7c8m4q2f3e9v6t5r1n0p8yz", name: "Default", slug: "default" },
        organization: {
          id: "org_01k7c8m4q2f3e9v6t5r1n0p8yz",
          name: "Acme",
          slug: "acme",
          api_version: LATEST_API_VERSION,
        },
        api_key: { id: "key_01k7c8m4q2f3e9v6t5r1n0p8yz", name: "Backend", start: "coss_test_Ab" },
      },
    ],
  });

export const getEnvironmentRoute = createRoute({
  method: "get",
  path: "/environment",
  operationId: "getEnvironment",
  tags: ["Environment"],
  summary: "Retrieve the API key's environment",
  description:
    "Which environment, project and organization the API key belongs to, and the key itself. " +
    "Any valid key can read its own environment (no permission needed): use it to check a key " +
    "and show where it sends.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({}), rateLimit("api.read")],
  responses: {
    200: jsonDoc("The API key's environment.", EnvironmentObject),
    ...commonErrors,
  },
});

export function createEnvironmentRoutes(): OpenAPIHono<AppEnv> {
  const router = new OpenAPIHono<AppEnv>();

  router.openapi(getEnvironmentRoute, async (c) => {
    const { auth } = c.var;
    const summary = await getApiKeyEnvironmentSummary(auth);
    // The key authenticated a moment ago: only a revocation in between gets here.
    if (!summary) {
      throw new ApiError(401, {
        type: "authentication_error",
        code: "invalid_api_key",
        message: "The API key is invalid, revoked or expired.",
      });
    }
    const { environment, project, organization, apiKey } = summary;
    return c.json(
      {
        object: "environment" as const,
        id: environment.id,
        name: environment.name,
        slug: environment.slug,
        mode: environment.mode,
        project,
        // The pin, not this request's version (the SDK always sends its own).
        organization: { ...organization, api_version: auth.apiVersion },
        api_key: apiKey,
      },
      200,
    );
  });

  return router;
}
