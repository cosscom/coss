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
  DomainList,
  DomainObject,
  DomainRecordObject,
  EmailEvent,
  EmailEventData,
  EmailEventList,
  EmailObject,
  EmailRecipient,
  EmailWebhookEvent,
  ImportSuppressionsRequest,
  SendEmailRequest,
  Suppression,
  SuppressionCheck,
  SuppressionImport,
  SuppressionList,
} from "../src/schemas.ts";

const SCHEMAS: Record<string, z.ZodType> = {
  SendEmailRequest,
  Email: EmailObject,
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
