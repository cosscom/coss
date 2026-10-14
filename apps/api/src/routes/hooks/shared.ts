import { type HookApplicationRow, requireHookApplication } from "@coss/hooks";
import { z } from "zod";
import type { AppEnv } from "../../types.ts";
import { errorDoc } from "../docs.ts";

export const TAGS = {
  applications: "Hooks applications",
  eventTypes: "Hooks event types",
  endpoints: "Hooks endpoints",
  messages: "Hooks messages",
  portal: "Hooks portal",
} as const;

export const SCOPE_NOTE =
  "Hooks resources belong to the API key's own environment: a `coss_test_…` key only ever sees " +
  "sandbox ones, a `coss_live_…` key only production ones.";

export const ApplicationParams = z.object({
  application: z.string().meta({
    description: "The application's `id` (`happ_…`) or your `uid` for it.",
    examples: ["customer_8812"],
  }),
});

export const applicationNotFound = errorDoc(
  "No application with this id or uid exists in the API key's environment (`application_not_found`).",
);

export const bodyErrors = {
  400: errorDoc("The body is not valid JSON (`invalid_json`)."),
  413: errorDoc("The request body is larger than 5 MB (`payload_too_large`)."),
  415: errorDoc("The body is not sent as `application/json` (`unsupported_media_type`)."),
};

/** The application the path names, in the key's environment (else `application_not_found`). */
export function requireApplication(
  auth: AppEnv["Variables"]["auth"],
  ref: string,
): Promise<HookApplicationRow> {
  return requireHookApplication({
    organizationId: auth.organizationId,
    environmentId: auth.environmentId,
    ref,
  });
}
