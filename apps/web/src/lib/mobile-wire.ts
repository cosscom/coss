import { permissionStrings, summarizeKeyAccess } from "@coss/auth/api-key-permissions";
import type { InvoiceSummaryOutput } from "@coss/billing/wire";
import type {
  ApiKey,
  AuditEvent,
  DnsRecord,
  Domain,
  DomainSummary,
  HookAttempt,
  HookDelivery,
  HookEndpoint,
  InvoiceSummary,
  LogDrain,
  LogDrainBatch,
  LogEntry,
  LogEntryDetail,
  MobileEmail,
  MobileEmailEvent,
  MobileEmailSummary,
  MobileEnvironment,
  MobileUser,
  ReceivedEmail,
  ReceivedEmailSummary,
  ReputationHistoryEvent,
  ReputationStanding,
  RiskAssessment,
  RiskAssessmentSummary,
  WebhookDelivery,
  WebhookEndpoint,
} from "@coss/companion";
import type {
  DomainObjectOutput,
  EmailEventOutput,
  EmailListItem,
  EmailObjectOutput,
  ReceivedEmailObjectOutput,
  ReceivedEmailSummaryOutput,
} from "@coss/email";
import type {
  HookAttemptObjectOutput,
  HookDeliveryObjectOutput,
  HookEndpointObjectOutput,
} from "@coss/hooks/schemas";
import type { LogEntryOutput, OrgAuditEventOutput } from "@coss/logs/schemas";
import type { ReputationEventWithActor, ReputationStandingRow } from "@coss/reputation";
import { toReputationObject } from "@coss/reputation";
import { triggerLabel } from "@coss/reputation/schemas";
import type { RiskAssessmentOutput } from "@coss/risk/schemas";
import type { Environment, EnvironmentApiKeySummary } from "@coss/tenancy";
import type {
  LogDrainBatchObjectOutput,
  LogDrainObjectOutput,
  WebhookDeliveryObjectOutput,
  WebhookEndpointObjectOutput,
} from "@coss/webhooks/schemas";
import { eventDetail } from "./email-events";
import type { MobileSession } from "./mobile-api";

export function toMobileUser(user: MobileSession["user"]): MobileUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image ?? null,
    two_factor_enabled: Boolean(user.twoFactorEnabled),
  };
}

export function toMobileEnvironment(environment: Environment): MobileEnvironment {
  return {
    id: environment.id,
    name: environment.name,
    slug: environment.slug,
    mode: environment.mode,
  };
}

export function toMobileStanding(row: ReputationStandingRow | null): ReputationStanding {
  const { status, reason, status_changed_at, evaluated_at, window, checks } =
    toReputationObject(row);
  return {
    status,
    reason,
    reason_label: reason ? triggerLabel(reason) : null,
    status_changed_at,
    evaluated_at,
    window,
    checks: checks.map((check) => ({ ...check, trigger_label: triggerLabel(check.trigger) })),
  };
}

/** What the customer's reputation page shows: no policy changes, admin identities or notes. */
export function toMobileHistory(events: ReputationEventWithActor[]): ReputationHistoryEvent[] {
  return events.flatMap((event) =>
    event.type === "policy_updated"
      ? []
      : [
          {
            id: event.id,
            type: event.type,
            trigger: event.trigger,
            trigger_label: triggerLabel(event.trigger),
            actor: event.actor === "system" ? "automatic" : "coss",
            created_at: event.createdAt.toISOString(),
          },
        ],
  );
}

export function toMobileEmailSummary(email: EmailListItem): MobileEmailSummary {
  return {
    id: email.id,
    to: email.to,
    subject: email.subject,
    status: email.status,
    sandbox: email.sandbox,
    created_at: email.created_at,
    scheduled_at: email.scheduled_at,
  };
}

export function toMobileEmail(email: EmailObjectOutput): MobileEmail {
  return {
    ...toMobileEmailSummary(email),
    from: email.from,
    cc: email.cc,
    bcc: email.bcc,
    reply_to: email.reply_to,
    category: email.category,
    text: email.text,
    has_html: email.html !== null,
    sent_at: email.sent_at,
    recipients: email.recipients,
    attachments: email.attachments.map(({ id, filename, content_type, size }) => ({
      id,
      filename,
      content_type,
      size,
    })),
    tracking: {
      opens: email.tracking.opens,
      clicks: email.tracking.clicks,
      open_count: email.tracking.open_count,
      click_count: email.tracking.click_count,
    },
  };
}

export function toMobileEmailEvent(event: EmailEventOutput): MobileEmailEvent {
  return {
    id: event.id,
    type: event.type,
    recipient: event.recipient,
    occurred_at: event.occurred_at,
    detail: eventDetail(event),
  };
}

export function toMobileReceivedSummary(email: ReceivedEmailSummaryOutput): ReceivedEmailSummary {
  return {
    id: email.id,
    status: email.status,
    from: email.from,
    mail_from: email.mail_from,
    recipients: email.recipients,
    subject: email.subject,
    spam: email.spam,
    size: email.size,
    attachment_count: email.attachments.length,
    received_at: email.received_at,
  };
}

export function toMobileReceived(email: ReceivedEmailObjectOutput): ReceivedEmail {
  return {
    ...toMobileReceivedSummary(email),
    to: email.to,
    cc: email.cc,
    reply_to: email.reply_to,
    message_id: email.message_id,
    in_reply_to: email.in_reply_to,
    sent_at: email.sent_at,
    blocked_reason: email.blocked_reason,
    verdicts: email.verdicts,
    text: email.text,
    has_html: email.html !== null,
    truncated: email.truncated,
    headers: email.headers,
    attachments: email.attachments.map(({ id, filename, content_type, disposition, size }) => ({
      id,
      filename,
      content_type,
      disposition,
      size,
    })),
  };
}

export function toMobileLogEntry(entry: LogEntryOutput): LogEntry {
  return {
    id: entry.id,
    occurred_at: entry.occurred_at,
    source: entry.source,
    level: entry.level,
    type: entry.type,
    message: entry.message,
    request_id: entry.request_id,
    api_key_id: entry.api_key_id,
    method: entry.method,
    path: entry.path,
    status_code: entry.status_code,
    duration_ms: entry.duration_ms,
    error_code: entry.error_code,
    resource_type: entry.resource_type,
    resource_id: entry.resource_id,
    recipient: entry.recipient,
  };
}

export function toMobileLogDetail(
  entry: LogEntryOutput,
  apiKeyNames: Record<string, string>,
): LogEntryDetail {
  return {
    ...toMobileLogEntry(entry),
    client_ip: entry.client_ip,
    user_agent: entry.user_agent,
    attributes: entry.attributes,
    api_key_name: entry.api_key_id ? (apiKeyNames[entry.api_key_id] ?? null) : null,
  };
}

/** Never the key itself: `listEnvironmentApiKeys` doesn't select it. */
export function toMobileApiKey(key: EnvironmentApiKeySummary): ApiKey {
  return {
    id: key.id,
    name: key.name,
    start: key.start,
    enabled: key.enabled,
    created_at: key.createdAt.toISOString(),
    last_used_at: key.lastRequest?.toISOString() ?? null,
    access: summarizeKeyAccess(key.access, key.permissions),
    permissions: permissionStrings(key.permissions),
  };
}

/** The public object, which never carries a secret. */
export function toMobileEndpoint(endpoint: WebhookEndpointObjectOutput): WebhookEndpoint {
  return {
    id: endpoint.id,
    url: endpoint.url,
    description: endpoint.description,
    event_types: endpoint.event_types,
    api_version: endpoint.api_version,
    enabled: endpoint.enabled,
    disabled_reason: endpoint.disabled_reason,
    disabled_at: endpoint.disabled_at,
    failing_since: endpoint.failing_since,
    created_at: endpoint.created_at,
  };
}

/** Like the dashboard: no payloads and no response excerpts. */
export function toMobileDelivery(delivery: WebhookDeliveryObjectOutput): WebhookDelivery {
  return {
    id: delivery.id,
    event_id: delivery.event_id,
    event_type: delivery.event_type,
    status: delivery.status,
    attempt_count: delivery.attempt_count,
    next_attempt_at: delivery.next_attempt_at,
    last_status_code: delivery.last_status_code,
    last_error: delivery.last_error,
    attempts: delivery.attempts.map(({ id, attempted_at, status_code, duration_ms, error }) => ({
      id,
      attempted_at,
      status_code,
      duration_ms,
      error,
    })),
    created_at: delivery.created_at,
  };
}

export function toMobileRiskSummary(assessment: RiskAssessmentOutput): RiskAssessmentSummary {
  return {
    id: assessment.id,
    event: assessment.event,
    event_name: assessment.event_name,
    decision: assessment.decision,
    score: assessment.score,
    user: assessment.user,
    reason_codes: assessment.reasons.map((reason) => reason.code),
    outcome: assessment.outcome,
    review_status: assessment.review_status,
    created_at: assessment.created_at,
  };
}

export function toMobileRisk(assessment: RiskAssessmentOutput, canReview: boolean): RiskAssessment {
  return {
    ...toMobileRiskSummary(assessment),
    ip: assessment.ip,
    degraded: assessment.degraded,
    reasons: assessment.reasons.map(({ code, message }) => ({ code, message })),
    signals: assessment.signals,
    can_review: canReview,
  };
}

function toMobileRecord(record: DnsRecord): DnsRecord {
  return {
    purpose: record.purpose,
    type: record.type,
    name: record.name,
    value: record.value,
    priority: record.priority,
    status: record.status,
    found: record.found,
  };
}

export function toMobileDomainSummary(domain: DomainObjectOutput): DomainSummary {
  return {
    id: domain.id,
    name: domain.name,
    status: domain.status,
    can_send: domain.can_send,
    last_checked_at: domain.last_checked_at,
    created_at: domain.created_at,
  };
}

export function toMobileDomain(
  domain: DomainObjectOutput,
  environmentNames: Record<string, string>,
): Domain {
  return {
    ...toMobileDomainSummary(domain),
    mail_from_domain: domain.mail_from_domain,
    mail_from_status: domain.mail_from_status,
    verified_at: domain.verified_at,
    records: domain.records.map(toMobileRecord),
    tracking: domain.tracking && {
      hostname: domain.tracking.hostname,
      status: domain.tracking.status,
      message: domain.tracking.status === "active" ? null : domain.tracking.message,
      record: toMobileRecord({ purpose: "tracking", priority: null, ...domain.tracking.record }),
    },
    receiving: domain.receiving && {
      hostname: domain.receiving.hostname,
      environment: environmentNames[domain.receiving.environment_id] ?? null,
      record: toMobileRecord({ purpose: "receiving", ...domain.receiving.record }),
    },
  };
}

export function toMobileInvoiceSummary(invoice: InvoiceSummaryOutput): InvoiceSummary {
  return {
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    period: invoice.period,
    total: invoice.total,
    amount_due: invoice.amount_due,
    due_at: invoice.due_at,
    finalized_at: invoice.finalized_at,
    paid_at: invoice.paid_at,
  };
}

export function toMobileAuditEvent(
  event: OrgAuditEventOutput,
  labels: { actor: string; actionLabel: string; details: string; environment: string | null },
): AuditEvent {
  return {
    id: event.id,
    created_at: event.created_at,
    action: event.action,
    action_label: labels.actionLabel,
    actor_type: event.actor_type,
    actor_label: labels.actor,
    target_label: event.target_label ?? event.target_id,
    environment: labels.environment,
    details: labels.details,
    client_ip: event.client_ip,
  };
}

/** The public object, which never carries a secret. */
export function toMobileHookEndpoint(endpoint: HookEndpointObjectOutput): HookEndpoint {
  return {
    id: endpoint.id,
    url: endpoint.url,
    description: endpoint.description,
    filter_types: endpoint.filter_types,
    rate_limit_per_second: endpoint.rate_limit_per_second,
    enabled: endpoint.enabled,
    disabled_reason: endpoint.disabled_reason,
    disabled_at: endpoint.disabled_at,
    failing_since: endpoint.failing_since,
    created_at: endpoint.created_at,
  };
}

export function toMobileHookDelivery(delivery: HookDeliveryObjectOutput): HookDelivery {
  return {
    id: delivery.id,
    message_id: delivery.message_id,
    endpoint_id: delivery.endpoint_id,
    status: delivery.status,
    attempt_count: delivery.attempt_count,
    next_attempt_at: delivery.next_attempt_at,
    last_status_code: delivery.last_status_code,
    last_error: delivery.last_error,
    created_at: delivery.created_at,
  };
}

/** Like the dashboard's message page, which shows response excerpts. */
export function toMobileHookAttempt(attempt: HookAttemptObjectOutput): HookAttempt {
  return {
    id: attempt.id,
    attempted_at: attempt.attempted_at,
    status_code: attempt.status_code,
    duration_ms: attempt.duration_ms,
    error: attempt.error,
    response_excerpt: attempt.response_excerpt,
  };
}

/** The public object, which never carries the signing secret. */
export function toMobileLogDrain(drain: LogDrainObjectOutput): LogDrain {
  return {
    id: drain.id,
    url: drain.url,
    description: drain.description,
    sources: drain.sources,
    enabled: drain.enabled,
    disabled_reason: drain.disabled_reason,
    disabled_at: drain.disabled_at,
    created_at: drain.created_at,
  };
}

/** Like the dashboard's batches table: the last attempt, its excerpt only while not sent. */
export function toMobileLogDrainBatch(batch: LogDrainBatchObjectOutput): LogDrainBatch {
  const last = batch.attempts.at(-1);
  return {
    id: batch.id,
    status: batch.status,
    line_count: batch.line_count,
    byte_size: batch.byte_size,
    attempt_count: batch.attempt_count,
    next_attempt_at: batch.next_attempt_at,
    last_status_code: batch.last_status_code,
    last_error: batch.last_error,
    last_attempt: last
      ? {
          status_code: last.status_code,
          duration_ms: last.duration_ms,
          error: last.error,
          response_excerpt: batch.status === "succeeded" ? null : last.response_excerpt,
        }
      : null,
    created_at: batch.created_at,
  };
}
