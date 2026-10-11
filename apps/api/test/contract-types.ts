/**
 * Compile-time contract between the API's zod schemas and the SDK's hand-written wire types.
 * Checked by `tsc --noEmit` (never executed): a mismatch is a type error in this file.
 */
import type {
  CheckSuppressionQuery,
  CreateDomainRequest,
  CreateSuppressionRequest,
  DeletedDomain,
  DeletedSuppression,
  DomainList,
  DomainObject,
  DomainRecordObject,
  EmailBatchObject,
  EmailEvent,
  EmailEventList,
  EmailLink,
  EmailLinkList,
  EmailObject,
  EmailRecipient,
  EmailWebhookEvent,
  ExportSuppressionsQuery,
  ImportSuppressionsRequest,
  ListSuppressionsQuery,
  SendEmailBatchRequest,
  SendEmailRequest,
  Suppression,
  SuppressionCheck,
  SuppressionImport,
  SuppressionList,
} from "@coss/email/schemas";
import type {
  AccountWebhookEvent,
  ReputationCheckObject,
  ReputationObject,
} from "@coss/reputation/schemas";
import type {
  DeletedWebhookEndpoint,
  ListWebhookDeliveriesQuery,
  WebhookAttemptObject,
  WebhookDeliveryList,
  WebhookDeliveryObject,
  WebhookEndpointList,
  WebhookEndpointObject,
  WebhookEndpointWithSecret,
} from "@coss/webhooks/schemas";
import type {
  CheckSuppressionParams,
  CossErrorIssue,
  CossErrorType,
  CreateDomainParams,
  CreateSuppressionParams,
  CreateWebhookEndpointParams,
  Email,
  EmailBatch,
  ExportSuppressionsParams,
  ImportSuppressionsParams,
  List,
  ListSuppressionsParams,
  ListWebhookDeliveriesParams,
  AccountWebhookEvent as SdkAccountWebhookEvent,
  DeletedDomain as SdkDeletedDomain,
  DeletedSuppression as SdkDeletedSuppression,
  DeletedWebhookEndpoint as SdkDeletedWebhookEndpoint,
  Domain as SdkDomain,
  DomainRecord as SdkDomainRecord,
  EmailEvent as SdkEmailEvent,
  EmailLink as SdkEmailLink,
  EmailRecipient as SdkEmailRecipient,
  EmailTracking as SdkEmailTracking,
  EmailWebhookEvent as SdkEmailWebhookEvent,
  WebhookEndpointWithSecret as SdkEndpointWithSecret,
  Reputation as SdkReputation,
  ReputationCheck as SdkReputationCheck,
  Suppression as SdkSuppression,
  SuppressionCheck as SdkSuppressionCheck,
  SuppressionImport as SdkSuppressionImport,
  WebhookAttempt as SdkWebhookAttempt,
  WebhookDelivery as SdkWebhookDelivery,
  SendEmailParams,
  TrackingOptions,
  UpdateWebhookEndpointParams,
  WebhookEndpoint,
  WebhookEvent,
} from "coss";
import type { z } from "zod";
import type { ErrorEnvelopeBody } from "../src/errors.ts";
import type {
  CreateWebhookEndpointRequest,
  UpdateWebhookEndpointRequest,
} from "../src/routes/webhook-endpoints.ts";

/** Identical types (stricter than mutual assignability: also catches optionality drift). */
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

/** Each side assignable to the other, with exactly the same keys. */
type MutuallyAssignable<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? Equals<keyof A, keyof B>
    : false
  : false;

type Assert<T extends true> = T;

type SendInput = z.input<typeof SendEmailRequest>;
type EmailOutput = z.output<typeof EmailObject>;
type ApiError = ErrorEnvelopeBody["error"];

export type Contract = [
  // Request: anything the SDK accepts is what the API validates, and vice versa.
  Assert<MutuallyAssignable<SendInput, SendEmailParams>>,
  Assert<Equals<keyof SendInput, keyof SendEmailParams>>,
  Assert<MutuallyAssignable<SendInput["to"], SendEmailParams["to"]>>,
  Assert<MutuallyAssignable<NonNullable<SendInput["tracking"]>, TrackingOptions>>,
  Assert<MutuallyAssignable<NonNullable<SendInput["tags"]>, NonNullable<SendEmailParams["tags"]>>>,
  Assert<
    MutuallyAssignable<
      NonNullable<SendInput["attachments"]>[number],
      NonNullable<SendEmailParams["attachments"]>[number]
    >
  >,
  // Response: what the API returns is exactly the SDK's `Email`.
  Assert<MutuallyAssignable<EmailOutput, Email>>,
  Assert<MutuallyAssignable<EmailOutput["status"], Email["status"]>>,
  Assert<MutuallyAssignable<EmailOutput["tags"], Email["tags"]>>,
  Assert<MutuallyAssignable<EmailOutput["attachments"][number], Email["attachments"][number]>>,
  Assert<MutuallyAssignable<z.output<typeof EmailRecipient>, SdkEmailRecipient>>,
  Assert<
    MutuallyAssignable<z.output<typeof EmailRecipient>["status"], SdkEmailRecipient["status"]>
  >,
  Assert<MutuallyAssignable<z.output<typeof EmailEvent>["type"], SdkEmailEvent["type"]>>,
  Assert<MutuallyAssignable<z.output<typeof EmailEvent>, SdkEmailEvent>>,
  Assert<MutuallyAssignable<z.output<typeof EmailEvent>["data"], SdkEmailEvent["data"]>>,
  Assert<MutuallyAssignable<z.output<typeof EmailEventList>, List<SdkEmailEvent>>>,
  Assert<MutuallyAssignable<EmailOutput["tracking"], SdkEmailTracking>>,
  Assert<MutuallyAssignable<z.output<typeof EmailLink>, SdkEmailLink>>,
  Assert<MutuallyAssignable<z.output<typeof EmailLinkList>, List<SdkEmailLink>>>,
  // Batch sends: `sendBatch(emails)` posts `{ emails }` and returns the batch.
  Assert<
    MutuallyAssignable<z.input<typeof SendEmailBatchRequest>["emails"][number], SendEmailParams>
  >,
  Assert<Equals<keyof z.input<typeof SendEmailBatchRequest>, "emails">>,
  Assert<MutuallyAssignable<z.output<typeof EmailBatchObject>, EmailBatch>>,
  // Domains: request and response shapes match the SDK's hand-written types.
  Assert<MutuallyAssignable<z.input<typeof CreateDomainRequest>, CreateDomainParams>>,
  Assert<MutuallyAssignable<z.output<typeof DomainObject>, SdkDomain>>,
  Assert<MutuallyAssignable<z.output<typeof DomainObject>["status"], SdkDomain["status"]>>,
  Assert<MutuallyAssignable<z.output<typeof DomainRecordObject>, SdkDomainRecord>>,
  Assert<MutuallyAssignable<z.output<typeof DomainList>, List<SdkDomain>>>,
  Assert<MutuallyAssignable<z.output<typeof DeletedDomain>, SdkDeletedDomain>>,
  // Webhook endpoints: same, including the create-only `secret`.
  Assert<
    MutuallyAssignable<z.input<typeof CreateWebhookEndpointRequest>, CreateWebhookEndpointParams>
  >,
  Assert<
    MutuallyAssignable<z.input<typeof UpdateWebhookEndpointRequest>, UpdateWebhookEndpointParams>
  >,
  Assert<MutuallyAssignable<z.output<typeof WebhookEndpointObject>, WebhookEndpoint>>,
  Assert<MutuallyAssignable<z.output<typeof WebhookEndpointWithSecret>, SdkEndpointWithSecret>>,
  Assert<MutuallyAssignable<z.output<typeof WebhookEndpointList>, List<WebhookEndpoint>>>,
  Assert<MutuallyAssignable<z.output<typeof DeletedWebhookEndpoint>, SdkDeletedWebhookEndpoint>>,
  // Delivery logs (the SDK sends `limit` as a number).
  Assert<
    MutuallyAssignable<
      Omit<z.input<typeof ListWebhookDeliveriesQuery>, "limit"> & { limit?: number },
      ListWebhookDeliveriesParams
    >
  >,
  Assert<MutuallyAssignable<z.output<typeof WebhookAttemptObject>, SdkWebhookAttempt>>,
  Assert<MutuallyAssignable<z.output<typeof WebhookDeliveryObject>, SdkWebhookDelivery>>,
  Assert<MutuallyAssignable<z.output<typeof WebhookDeliveryList>, List<SdkWebhookDelivery>>>,
  // Webhooks: every body COSS sends is exactly one member of the SDK's `WebhookEvent`.
  Assert<MutuallyAssignable<z.output<typeof EmailWebhookEvent>, SdkEmailWebhookEvent>>,
  Assert<
    MutuallyAssignable<z.output<typeof EmailWebhookEvent>["data"], SdkEmailWebhookEvent["data"]>
  >,
  Assert<MutuallyAssignable<z.output<typeof AccountWebhookEvent>, SdkAccountWebhookEvent>>,
  Assert<
    MutuallyAssignable<z.output<typeof AccountWebhookEvent>["data"], SdkAccountWebhookEvent["data"]>
  >,
  Assert<
    MutuallyAssignable<
      z.output<typeof EmailWebhookEvent> | z.output<typeof AccountWebhookEvent>,
      WebhookEvent
    >
  >,
  // Reputation.
  Assert<MutuallyAssignable<z.output<typeof ReputationObject>, SdkReputation>>,
  Assert<MutuallyAssignable<z.output<typeof ReputationCheckObject>, SdkReputationCheck>>,
  // Suppressions: request bodies and queries (the SDK sends `limit` as a number), and responses.
  Assert<MutuallyAssignable<z.input<typeof CreateSuppressionRequest>, CreateSuppressionParams>>,
  Assert<
    MutuallyAssignable<
      Omit<z.input<typeof ListSuppressionsQuery>, "limit"> & { limit?: number },
      ListSuppressionsParams
    >
  >,
  Assert<MutuallyAssignable<z.input<typeof CheckSuppressionQuery>, CheckSuppressionParams>>,
  Assert<MutuallyAssignable<z.output<typeof Suppression>, SdkSuppression>>,
  Assert<MutuallyAssignable<z.output<typeof SuppressionList>, List<SdkSuppression>>>,
  Assert<MutuallyAssignable<z.output<typeof SuppressionCheck>, SdkSuppressionCheck>>,
  Assert<MutuallyAssignable<z.output<typeof DeletedSuppression>, SdkDeletedSuppression>>,
  Assert<MutuallyAssignable<z.input<typeof ImportSuppressionsRequest>, ImportSuppressionsParams>>,
  Assert<MutuallyAssignable<z.output<typeof SuppressionImport>, SdkSuppressionImport>>,
  Assert<MutuallyAssignable<z.input<typeof ExportSuppressionsQuery>, ExportSuppressionsParams>>,
  // Errors: every API error type is one the SDK knows, and issues have the same shape.
  Assert<ApiError["type"] extends CossErrorType ? true : false>,
  Assert<MutuallyAssignable<NonNullable<ApiError["issues"]>[number], CossErrorIssue>>,
];
