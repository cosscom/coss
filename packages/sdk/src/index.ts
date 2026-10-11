export { API_VERSION, API_VERSIONS, type ApiVersion } from "./api-version.ts";
export { Coss, type CossOptions } from "./client.ts";
export type { CossError, CossErrorIssue, CossErrorType, CossResult } from "./core/errors.ts";
export type { FetchLike, RequestOptions } from "./core/http.ts";
export type { DomainsResource } from "./resources/domains.ts";
export type { EmailResource } from "./resources/email.ts";
export type { ReputationResource } from "./resources/reputation.ts";
export type { SuppressionResource } from "./resources/suppressions.ts";
export type { TrackingDomainsResource } from "./resources/tracking-domains.ts";
export type { WebhookDeliveriesResource } from "./resources/webhook-deliveries.ts";
export type { WebhookEndpointsResource } from "./resources/webhook-endpoints.ts";
export type {
  CreateDomainParams,
  CreateTrackingDomainParams,
  DeletedDomain,
  Domain,
  DomainRecord,
  DomainRecordPurpose,
  DomainRecordStatus,
  DomainStatus,
  MailFromStatus,
  TrackingDomain,
  TrackingDomainRecord,
  TrackingDomainStatus,
} from "./types/domain.ts";
export type {
  Email,
  EmailAttachment,
  EmailAttachmentParams,
  EmailBatch,
  EmailEvent,
  EmailEventData,
  EmailEventType,
  EmailLink,
  EmailRecipient,
  EmailRecipientStatus,
  EmailStatus,
  EmailTag,
  EmailTracking,
  List,
  SendEmailParams,
  TrackingOptions,
} from "./types/email.ts";
export type {
  Reputation,
  ReputationCheck,
  ReputationCheckSeverity,
  ReputationStatus,
} from "./types/reputation.ts";
export type {
  CheckSuppressionParams,
  CreateSuppressionParams,
  DeletedSuppression,
  ExportSuppressionsParams,
  ImportSuppressionEntry,
  ImportSuppressionsParams,
  ListSuppressionsParams,
  Suppression,
  SuppressionCheck,
  SuppressionImport,
  SuppressionReason,
} from "./types/suppression.ts";
export type {
  AccountEventType,
  AccountWebhookEvent,
  AccountWebhookEventData,
  EmailWebhookEvent,
  EmailWebhookEventData,
  WebhookEvent,
} from "./types/webhook.ts";
export type {
  CreateWebhookEndpointParams,
  DeletedWebhookEndpoint,
  ListWebhookDeliveriesParams,
  UpdateWebhookEndpointParams,
  WebhookAttempt,
  WebhookDelivery,
  WebhookDeliveryStatus,
  WebhookEndpoint,
  WebhookEndpointWithSecret,
  WebhookEventType,
} from "./types/webhook-endpoint.ts";
export { VERSION } from "./version.ts";
export {
  type VerifyWebhookOptions,
  verifyWebhook,
  type WebhookHeaders,
  WebhookVerificationError,
} from "./webhooks.ts";
