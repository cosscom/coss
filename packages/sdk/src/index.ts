export { Coss, type CossOptions } from "./client.ts";
export type { CossError, CossErrorIssue, CossErrorType, CossResult } from "./core/errors.ts";
export type { FetchLike, RequestOptions } from "./core/http.ts";
export type { DomainsResource } from "./resources/domains.ts";
export type { EmailResource } from "./resources/email.ts";
export type { SuppressionResource } from "./resources/suppressions.ts";
export type { WebhookEndpointsResource } from "./resources/webhook-endpoints.ts";
export type {
  CreateDomainParams,
  DeletedDomain,
  Domain,
  DomainRecord,
  DomainRecordPurpose,
  DomainRecordStatus,
  DomainStatus,
  MailFromStatus,
} from "./types/domain.ts";
export type {
  Email,
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
export type { EmailWebhookEventData, WebhookEvent } from "./types/webhook.ts";
export type {
  CreateWebhookEndpointParams,
  DeletedWebhookEndpoint,
  UpdateWebhookEndpointParams,
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
