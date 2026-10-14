/**
 * The first `examples` entry of each wire schema is what the API reference shows (and the docs' code samples
 * send), so it must be a valid value of that schema.
 */
import { expect, test } from "bun:test";
import type { z } from "zod";
import {
  CreateDomainRequest,
  CreateSuppressionRequest,
  DeletedDomain,
  DeletedSuppression,
  DeletedTrackingRule,
  DomainList,
  DomainObject,
  DomainRecordObject,
  EmailBatchObject,
  EmailEvent,
  EmailEventData,
  EmailEventList,
  EmailLink,
  EmailLinkList,
  EmailObject,
  EmailRecipient,
  EmailTracking,
  EmailWebhookEvent,
  ImportSuppressionsRequest,
  SendEmailBatchRequest,
  SendEmailRequest,
  Suppression,
  SuppressionCheck,
  SuppressionImport,
  SuppressionList,
  TrackingRule,
  TrackingSettings,
  UpdateTrackingRuleRequest,
} from "../src/schemas.ts";

const SCHEMAS: Record<string, z.ZodType> = {
  SendEmailRequest,
  SendEmailBatchRequest,
  Email: EmailObject,
  EmailBatch: EmailBatchObject,
  EmailLink,
  EmailLinkList,
  EmailTracking,
  EmailRecipient,
  EmailEvent,
  EmailEventData,
  EmailEventList,
  EmailWebhookEvent,
  Domain: DomainObject,
  DomainRecord: DomainRecordObject,
  DomainList,
  CreateDomainRequest,
  DeletedDomain,
  Suppression,
  SuppressionList,
  SuppressionCheck,
  CreateSuppressionRequest,
  DeletedSuppression,
  ImportSuppressionsRequest,
  SuppressionImport,
  TrackingRule,
  TrackingSettings,
  UpdateTrackingRuleRequest,
  DeletedTrackingRule,
};

for (const [name, schema] of Object.entries(SCHEMAS)) {
  test(`${name} has an example that it accepts`, () => {
    // OpenAPI 3.1 (JSON Schema) form: `examples`, not the deprecated `example`.
    const [example] = (schema.meta()?.examples as unknown[] | undefined) ?? [];
    expect(example).toBeDefined();
    const result = schema.safeParse(example);
    expect(result.error?.issues ?? []).toEqual([]);
  });
}
