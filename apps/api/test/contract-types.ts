/**
 * Compile-time contract between the API's zod schemas and the SDK's hand-written wire types.
 * Checked by `tsc --noEmit` (never executed): a mismatch is a type error in this file.
 */

import type {
  BillingObject,
  BillingWebhookEvent,
  CreditList,
  CreditObject,
  InvoiceList,
  InvoiceObject,
  InvoiceSummary,
  ListCreditsQuery,
  ListInvoicesQuery,
  UsageList,
  UsageObject,
  UsageQuery,
} from "@coss/billing/wire";
import type {
  CheckSuppressionQuery,
  CreateDomainRequest,
  CreateReceivingDomainRequest,
  CreateSuppressionRequest,
  CreateTrackingDomainRequest,
  DeletedDomain,
  DeletedReceivedEmail,
  DeletedSuppression,
  DeletedTrackingRule,
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
  InboundAddressObject,
  ListReceivedEmailsQuery,
  ListSuppressionsQuery,
  ReceivedEmailList,
  ReceivedEmailObject,
  ReceivedEmailSummary,
  ReceivedEmailWebhookEvent,
  ReceivingDomainObject,
  RescheduleEmailRequest,
  SendEmailBatchRequest,
  SendEmailRequest,
  Suppression,
  SuppressionCheck,
  SuppressionImport,
  SuppressionList,
  TrackingDomainObject,
  TrackingRule,
  TrackingSettings,
  UpdateTrackingRuleRequest,
} from "@coss/email/schemas";
import type {
  LogDrainSource as ApiLogDrainSource,
  AuditEvent,
  AuditEventList,
  ListAuditEventsQuery,
  ListLogsQuery,
  LogEntry,
  LogList,
} from "@coss/logs/schemas";
import type {
  AccountWebhookEvent,
  ReputationCheckObject,
  ReputationObject,
} from "@coss/reputation/schemas";
import type {
  CreateRiskAssessmentRequest,
  CreateRiskFeedbackRequest,
  CreateRiskListEntryRequest,
  CreateRiskRuleRequest,
  DeletedRiskListEntry,
  DeletedRiskRule,
  ForgottenRiskUser,
  ListRiskAssessmentsQuery,
  ListRiskListEntriesQuery,
  RiskAssessment,
  RiskAssessmentList,
  RiskListEntry,
  RiskListEntryList,
  RiskRule,
  RiskRuleCondition,
  RiskRuleList,
  RiskSettings,
  RiskWebhookEvent,
  UpdateRiskRuleRequest,
  UpdateRiskSettingsRequest,
} from "@coss/risk/schemas";
import type { ApiVersion } from "@coss/versioning";
import type {
  CreateLogDrainRequest,
  DeletedLogDrain,
  DeletedWebhookEndpoint,
  HookEndpointWebhookEvent,
  ListLogDrainBatchesQuery,
  ListWebhookDeliveriesQuery,
  LogDrainAttemptObject,
  LogDrainBatchList,
  LogDrainBatchObject,
  LogDrainList,
  LogDrainObject,
  LogDrainWithSecret,
  RecoverWebhookEndpointRequest,
  RecoverWebhookEndpointResult,
  RollWebhookEndpointSecretRequest,
  UpdateLogDrainRequest,
  WebhookAttemptObject,
  WebhookDeliveryList,
  WebhookDeliveryObject,
  WebhookEndpointList,
  WebhookEndpointObject,
  WebhookEndpointWithSecret,
} from "@coss/webhooks/schemas";
import type {
  AssessRiskParams,
  CheckSuppressionParams,
  CossErrorIssue,
  CossErrorType,
  CreateDomainParams,
  CreateLogDrainParams,
  CreateReceivingDomainParams,
  CreateRiskListEntryParams,
  CreateRiskRuleParams,
  CreateSuppressionParams,
  CreateTrackingDomainParams,
  CreateWebhookEndpointParams,
  Email,
  EmailBatch,
  ExportSuppressionsParams,
  ImportSuppressionsParams,
  List,
  ListAuditEventsParams,
  ListCreditsParams,
  ListInvoicesParams,
  ListLogDrainBatchesParams,
  ListLogsParams,
  ListReceivedEmailsParams,
  ListRiskAssessmentsParams,
  ListRiskListEntriesParams,
  ListSuppressionsParams,
  ListUsageParams,
  ListWebhookDeliveriesParams,
  LogDrain,
  LogDrainAttempt,
  LogDrainBatch,
  LogDrainLine,
  LogDrainSource,
  RecoverWebhookEndpointParams,
  RescheduleEmailParams,
  RiskFeedbackParams,
  RollWebhookEndpointSecretParams,
  AccountWebhookEvent as SdkAccountWebhookEvent,
  ApiVersion as SdkApiVersion,
  AuditEvent as SdkAuditEvent,
  Billing as SdkBilling,
  BillingWebhookEvent as SdkBillingWebhookEvent,
  Credit as SdkCredit,
  DeletedDomain as SdkDeletedDomain,
  DeletedLogDrain as SdkDeletedLogDrain,
  DeletedReceivedEmail as SdkDeletedReceivedEmail,
  DeletedRiskListEntry as SdkDeletedRiskListEntry,
  DeletedRiskRule as SdkDeletedRiskRule,
  DeletedSuppression as SdkDeletedSuppression,
  DeletedTrackingRule as SdkDeletedTrackingRule,
  DeletedWebhookEndpoint as SdkDeletedWebhookEndpoint,
  Domain as SdkDomain,
  DomainRecord as SdkDomainRecord,
  EmailEvent as SdkEmailEvent,
  EmailLink as SdkEmailLink,
  EmailRecipient as SdkEmailRecipient,
  EmailTracking as SdkEmailTracking,
  EmailWebhookEvent as SdkEmailWebhookEvent,
  WebhookEndpointWithSecret as SdkEndpointWithSecret,
  ForgottenRiskUser as SdkForgottenRiskUser,
  HookEndpointWebhookEvent as SdkHookEndpointWebhookEvent,
  InboundAddress as SdkInboundAddress,
  Invoice as SdkInvoice,
  InvoiceSummary as SdkInvoiceSummary,
  List as SdkList,
  Log as SdkLog,
  LogDrainWithSecret as SdkLogDrainWithSecret,
  ReceivedEmail as SdkReceivedEmail,
  ReceivedEmailSummary as SdkReceivedEmailSummary,
  ReceivedEmailWebhookEvent as SdkReceivedEmailWebhookEvent,
  ReceivingDomain as SdkReceivingDomain,
  Reputation as SdkReputation,
  ReputationCheck as SdkReputationCheck,
  RiskAssessment as SdkRiskAssessment,
  RiskListEntry as SdkRiskListEntry,
  RiskRule as SdkRiskRule,
  RiskRuleCondition as SdkRiskRuleCondition,
  RiskSettings as SdkRiskSettings,
  RiskWebhookEvent as SdkRiskWebhookEvent,
  Suppression as SdkSuppression,
  SuppressionCheck as SdkSuppressionCheck,
  SuppressionImport as SdkSuppressionImport,
  TrackingDomain as SdkTrackingDomain,
  TrackingRule as SdkTrackingRule,
  TrackingSettings as SdkTrackingSettings,
  Usage as SdkUsage,
  WebhookAttempt as SdkWebhookAttempt,
  WebhookDelivery as SdkWebhookDelivery,
  SendEmailParams,
  TrackingOptions,
  UpdateLogDrainParams,
  UpdateRiskRuleParams,
  UpdateRiskSettingsParams,
  UpdateTrackingRuleParams,
  UpdateWebhookEndpointParams,
  WebhookEndpoint,
  WebhookEndpointRecovery,
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
  // API versions: the SDK knows exactly the API's versions.
  Assert<MutuallyAssignable<ApiVersion, SdkApiVersion>>,
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
  // Rescheduling: `reschedule(id, params)` posts the params as they are.
  Assert<MutuallyAssignable<z.input<typeof RescheduleEmailRequest>, RescheduleEmailParams>>,
  Assert<Equals<keyof z.input<typeof RescheduleEmailRequest>, keyof RescheduleEmailParams>>,
  // Domains: request and response shapes match the SDK's hand-written types.
  Assert<MutuallyAssignable<z.input<typeof CreateDomainRequest>, CreateDomainParams>>,
  Assert<MutuallyAssignable<z.output<typeof DomainObject>, SdkDomain>>,
  Assert<MutuallyAssignable<z.output<typeof DomainObject>["status"], SdkDomain["status"]>>,
  Assert<MutuallyAssignable<z.output<typeof DomainRecordObject>, SdkDomainRecord>>,
  Assert<MutuallyAssignable<z.output<typeof DomainList>, List<SdkDomain>>>,
  Assert<MutuallyAssignable<z.output<typeof DeletedDomain>, SdkDeletedDomain>>,
  Assert<
    MutuallyAssignable<z.input<typeof CreateTrackingDomainRequest>, CreateTrackingDomainParams>
  >,
  Assert<MutuallyAssignable<z.output<typeof TrackingDomainObject>, SdkTrackingDomain>>,
  // Webhook endpoints: same, including the create-only `secret`.
  Assert<
    MutuallyAssignable<z.input<typeof CreateWebhookEndpointRequest>, CreateWebhookEndpointParams>
  >,
  Assert<
    MutuallyAssignable<z.input<typeof UpdateWebhookEndpointRequest>, UpdateWebhookEndpointParams>
  >,
  Assert<
    MutuallyAssignable<
      z.input<typeof RollWebhookEndpointSecretRequest>,
      RollWebhookEndpointSecretParams
    >
  >,
  // The SDK also accepts a `Date` for `since` and sends it as an ISO string.
  Assert<
    MutuallyAssignable<
      z.input<typeof RecoverWebhookEndpointRequest>,
      Omit<RecoverWebhookEndpointParams, "since"> & { since: string }
    >
  >,
  Assert<
    MutuallyAssignable<z.output<typeof RecoverWebhookEndpointResult>, WebhookEndpointRecovery>
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
  Assert<MutuallyAssignable<z.output<typeof RiskWebhookEvent>, SdkRiskWebhookEvent>>,
  Assert<
    MutuallyAssignable<z.output<typeof RiskWebhookEvent>["data"], SdkRiskWebhookEvent["data"]>
  >,
  Assert<
    MutuallyAssignable<z.output<typeof HookEndpointWebhookEvent>, SdkHookEndpointWebhookEvent>
  >,
  Assert<
    MutuallyAssignable<z.output<typeof ReceivedEmailWebhookEvent>, SdkReceivedEmailWebhookEvent>
  >,
  Assert<
    MutuallyAssignable<
      z.output<typeof ReceivedEmailWebhookEvent>["data"],
      SdkReceivedEmailWebhookEvent["data"]
    >
  >,
  Assert<
    MutuallyAssignable<
      | z.output<typeof EmailWebhookEvent>
      | z.output<typeof ReceivedEmailWebhookEvent>
      | z.output<typeof AccountWebhookEvent>
      | z.output<typeof HookEndpointWebhookEvent>
      | z.output<typeof BillingWebhookEvent>
      | z.output<typeof RiskWebhookEvent>,
      WebhookEvent
    >
  >,
  // Receiving: received emails (the SDK sends `limit` as a number), the inbound address and
  // receiving domains.
  Assert<MutuallyAssignable<z.output<typeof ReceivedEmailSummary>, SdkReceivedEmailSummary>>,
  Assert<MutuallyAssignable<z.output<typeof ReceivedEmailObject>, SdkReceivedEmail>>,
  Assert<MutuallyAssignable<z.output<typeof ReceivedEmailList>, List<SdkReceivedEmailSummary>>>,
  Assert<
    MutuallyAssignable<
      Omit<z.input<typeof ListReceivedEmailsQuery>, "limit"> & { limit?: number },
      ListReceivedEmailsParams
    >
  >,
  Assert<MutuallyAssignable<z.output<typeof DeletedReceivedEmail>, SdkDeletedReceivedEmail>>,
  Assert<MutuallyAssignable<z.output<typeof InboundAddressObject>, SdkInboundAddress>>,
  Assert<MutuallyAssignable<z.output<typeof ReceivingDomainObject>, SdkReceivingDomain>>,
  Assert<
    MutuallyAssignable<z.input<typeof CreateReceivingDomainRequest>, CreateReceivingDomainParams>
  >,
  // Billing: responses, queries (the SDK sends `limit` as a number) and webhook events.
  Assert<MutuallyAssignable<z.output<typeof BillingObject>, SdkBilling>>,
  Assert<MutuallyAssignable<z.output<typeof UsageObject>, SdkUsage>>,
  Assert<MutuallyAssignable<z.output<typeof UsageList>, SdkList<SdkUsage> & { has_more: false }>>,
  Assert<MutuallyAssignable<z.input<typeof UsageQuery>, ListUsageParams>>,
  Assert<MutuallyAssignable<z.output<typeof InvoiceSummary>, SdkInvoiceSummary>>,
  Assert<MutuallyAssignable<z.output<typeof InvoiceObject>, SdkInvoice>>,
  Assert<MutuallyAssignable<z.output<typeof InvoiceList>, SdkList<SdkInvoiceSummary>>>,
  Assert<
    MutuallyAssignable<
      Omit<z.input<typeof ListInvoicesQuery>, "limit"> & { limit?: number },
      ListInvoicesParams
    >
  >,
  Assert<MutuallyAssignable<z.output<typeof CreditObject>, SdkCredit>>,
  Assert<MutuallyAssignable<z.output<typeof CreditList>, SdkList<SdkCredit>>>,
  Assert<
    MutuallyAssignable<
      Omit<z.input<typeof ListCreditsQuery>, "limit"> & { limit?: number },
      ListCreditsParams
    >
  >,
  Assert<MutuallyAssignable<z.output<typeof BillingWebhookEvent>, SdkBillingWebhookEvent>>,
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
  // Tracking settings.
  Assert<MutuallyAssignable<z.input<typeof UpdateTrackingRuleRequest>, UpdateTrackingRuleParams>>,
  Assert<MutuallyAssignable<z.output<typeof TrackingRule>, SdkTrackingRule>>,
  Assert<MutuallyAssignable<z.output<typeof TrackingSettings>, SdkTrackingSettings>>,
  Assert<MutuallyAssignable<z.output<typeof DeletedTrackingRule>, SdkDeletedTrackingRule>>,
  // Logs: responses, and the query's parameter names (the SDK also accepts arrays and Dates).
  Assert<MutuallyAssignable<z.output<typeof LogEntry>, SdkLog>>,
  Assert<MutuallyAssignable<z.output<typeof LogList>, List<SdkLog>>>,
  Assert<Equals<keyof z.input<typeof ListLogsQuery>, keyof ListLogsParams>>,
  // Audit log: the same.
  Assert<MutuallyAssignable<z.output<typeof AuditEvent>, SdkAuditEvent>>,
  Assert<MutuallyAssignable<z.output<typeof AuditEventList>, List<SdkAuditEvent>>>,
  Assert<Equals<keyof z.input<typeof ListAuditEventsQuery>, keyof ListAuditEventsParams>>,
  // Log drains: management, batches, and the lines a batch carries.
  Assert<MutuallyAssignable<z.input<typeof CreateLogDrainRequest>, CreateLogDrainParams>>,
  Assert<MutuallyAssignable<z.input<typeof UpdateLogDrainRequest>, UpdateLogDrainParams>>,
  Assert<MutuallyAssignable<z.output<typeof LogDrainObject>, LogDrain>>,
  Assert<MutuallyAssignable<z.output<typeof LogDrainWithSecret>, SdkLogDrainWithSecret>>,
  Assert<MutuallyAssignable<z.output<typeof LogDrainList>, List<LogDrain>>>,
  Assert<MutuallyAssignable<z.output<typeof DeletedLogDrain>, SdkDeletedLogDrain>>,
  Assert<
    MutuallyAssignable<
      Omit<z.input<typeof ListLogDrainBatchesQuery>, "limit"> & { limit?: number },
      ListLogDrainBatchesParams
    >
  >,
  Assert<MutuallyAssignable<z.output<typeof LogDrainAttemptObject>, LogDrainAttempt>>,
  Assert<MutuallyAssignable<z.output<typeof LogDrainBatchObject>, LogDrainBatch>>,
  Assert<MutuallyAssignable<z.output<typeof LogDrainBatchList>, List<LogDrainBatch>>>,
  Assert<MutuallyAssignable<ApiLogDrainSource, LogDrainSource>>,
  Assert<MutuallyAssignable<z.output<typeof LogEntry> | z.output<typeof AuditEvent>, LogDrainLine>>,
  // Risk: assessments, feedback, list entries (the SDK's `lists.add` builds the wire body).
  Assert<MutuallyAssignable<z.input<typeof CreateRiskAssessmentRequest>, AssessRiskParams>>,
  Assert<
    MutuallyAssignable<
      NonNullable<z.input<typeof CreateRiskAssessmentRequest>["user"]>,
      NonNullable<AssessRiskParams["user"]>
    >
  >,
  Assert<MutuallyAssignable<z.output<typeof RiskAssessment>, SdkRiskAssessment>>,
  Assert<
    MutuallyAssignable<
      z.output<typeof RiskAssessment>["reasons"][number],
      SdkRiskAssessment["reasons"][number]
    >
  >,
  Assert<
    MutuallyAssignable<z.output<typeof RiskAssessment>["signals"], SdkRiskAssessment["signals"]>
  >,
  Assert<MutuallyAssignable<z.output<typeof RiskAssessmentList>, List<SdkRiskAssessment>>>,
  Assert<
    MutuallyAssignable<
      Omit<z.input<typeof ListRiskAssessmentsQuery>, "limit"> & { limit?: number },
      ListRiskAssessmentsParams
    >
  >,
  Assert<MutuallyAssignable<z.input<typeof CreateRiskFeedbackRequest>, RiskFeedbackParams>>,
  Assert<MutuallyAssignable<z.input<typeof CreateRiskListEntryRequest>, CreateRiskListEntryParams>>,
  Assert<MutuallyAssignable<z.output<typeof RiskListEntry>, SdkRiskListEntry>>,
  Assert<MutuallyAssignable<z.output<typeof RiskListEntryList>, List<SdkRiskListEntry>>>,
  Assert<
    MutuallyAssignable<
      Omit<z.input<typeof ListRiskListEntriesQuery>, "limit"> & { limit?: number },
      ListRiskListEntriesParams
    >
  >,
  Assert<MutuallyAssignable<z.output<typeof DeletedRiskListEntry>, SdkDeletedRiskListEntry>>,
  Assert<MutuallyAssignable<z.output<typeof ForgottenRiskUser>, SdkForgottenRiskUser>>,
  Assert<MutuallyAssignable<z.output<typeof RiskSettings>, SdkRiskSettings>>,
  Assert<MutuallyAssignable<z.input<typeof UpdateRiskSettingsRequest>, UpdateRiskSettingsParams>>,
  Assert<MutuallyAssignable<z.output<typeof RiskRuleCondition>, SdkRiskRuleCondition>>,
  Assert<MutuallyAssignable<z.output<typeof RiskRule>, SdkRiskRule>>,
  Assert<
    MutuallyAssignable<z.output<typeof RiskRuleList>, List<SdkRiskRule> & { has_more: false }>
  >,
  Assert<MutuallyAssignable<z.input<typeof CreateRiskRuleRequest>, CreateRiskRuleParams>>,
  Assert<MutuallyAssignable<z.input<typeof UpdateRiskRuleRequest>, UpdateRiskRuleParams>>,
  Assert<MutuallyAssignable<z.output<typeof DeletedRiskRule>, SdkDeletedRiskRule>>,
  // Errors: every API error type is one the SDK knows, and issues have the same shape.
  Assert<ApiError["type"] extends CossErrorType ? true : false>,
  Assert<MutuallyAssignable<NonNullable<ApiError["issues"]>[number], CossErrorIssue>>,
];
