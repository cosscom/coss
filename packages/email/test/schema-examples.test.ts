/**
 * The first `examples` entry of each wire schema is what the API reference shows (and the docs' code samples
 * send), so it must be a valid value of that schema.
 */
import { expect, test } from "bun:test";
import type { z } from "zod";
import {
  CreateDomainRequest,
  CreateReceivingDomainRequest,
  CreateSuppressionRequest,
  DeletedDomain,
  DeletedReceivedEmail,
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
  EmailMetrics,
  EmailObject,
  EmailRecipient,
  EmailTracking,
  EmailWebhookEvent,
  ImportSuppressionsRequest,
  InboundAddressObject,
  ReceivedEmailAttachmentObject,
  ReceivedEmailList,
  ReceivedEmailObject,
  ReceivedEmailSummary,
  ReceivedEmailVerdicts,
  ReceivedEmailWebhookEvent,
  ReceivingDomainObject,
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
  EmailMetrics,
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
  ReceivedEmail: ReceivedEmailObject,
  ReceivedEmailSummary,
  ReceivedEmailAttachment: ReceivedEmailAttachmentObject,
  ReceivedEmailVerdicts,
  ReceivedEmailList,
  DeletedReceivedEmail,
  InboundAddress: InboundAddressObject,
  ReceivingDomain: ReceivingDomainObject,
  CreateReceivingDomainRequest,
  ReceivedEmailWebhookEvent,
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
