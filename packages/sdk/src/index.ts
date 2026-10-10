export { Coss, type CossOptions } from "./client.ts";
export type { CossError, CossErrorIssue, CossErrorType, CossResult } from "./core/errors.ts";
export type { FetchLike, RequestOptions } from "./core/http.ts";
export type { EmailResource } from "./resources/email.ts";
export type { SuppressionResource } from "./resources/suppressions.ts";
export type {
  Email,
  EmailEvent,
  EmailEventData,
  EmailEventType,
  EmailRecipient,
  EmailRecipientStatus,
  EmailStatus,
  EmailTag,
  List,
  SendEmailParams,
} from "./types/email.ts";
export type {
  CheckSuppressionParams,
  CreateSuppressionParams,
  DeletedSuppression,
  ListSuppressionsParams,
  Suppression,
  SuppressionCheck,
  SuppressionReason,
} from "./types/suppression.ts";
export type { EmailWebhookEventData, WebhookEvent } from "./types/webhook.ts";
export { VERSION } from "./version.ts";
export {
  type VerifyWebhookOptions,
  verifyWebhook,
  type WebhookHeaders,
  WebhookVerificationError,
} from "./webhooks.ts";
