<?php

namespace Coss\WebhookListeners\Types;

enum CreateWebhookListenerRequestEventTypesItem: string
{
    case EmailSent = "email.sent";
    case EmailDelivered = "email.delivered";
    case EmailDeliveryDelayed = "email.delivery_delayed";
    case EmailBounced = "email.bounced";
    case EmailComplained = "email.complained";
    case EmailFailed = "email.failed";
    case EmailSuppressed = "email.suppressed";
    case EmailScheduled = "email.scheduled";
    case EmailCanceled = "email.canceled";
    case EmailOpened = "email.opened";
    case EmailClicked = "email.clicked";
    case EmailRescheduled = "email.rescheduled";
    case EmailUnsubscribed = "email.unsubscribed";
    case EmailReceived = "email.received";
    case DomainDmarcReportReceived = "domain.dmarc_report_received";
    case AccountReputationWarning = "account.reputation_warning";
    case AccountReputationRecovered = "account.reputation_recovered";
    case AccountSuspended = "account.suspended";
    case AccountReinstated = "account.reinstated";
    case AccountMarketingPaused = "account.marketing_paused";
    case AccountMarketingReinstated = "account.marketing_reinstated";
    case HookEndpointDisabled = "hook_endpoint.disabled";
    case BillingInvoiceFinalized = "billing.invoice_finalized";
    case BillingInvoicePaid = "billing.invoice_paid";
    case BillingInvoicePaymentFailed = "billing.invoice_payment_failed";
    case BillingInvoiceVoided = "billing.invoice_voided";
    case BillingPlanChanged = "billing.plan_changed";
    case BillingUsageThresholdReached = "billing.usage_threshold_reached";
    case BillingHoldPlaced = "billing.hold_placed";
    case BillingHoldLifted = "billing.hold_lifted";
    case BillingCreditGranted = "billing.credit_granted";
    case RiskAssessmentReview = "risk.assessment.review";
    case RiskAssessmentReviewed = "risk.assessment.reviewed";
    case ContactCreated = "contact.created";
    case ContactUpdated = "contact.updated";
    case ContactDeleted = "contact.deleted";
    case ContactUnsubscribed = "contact.unsubscribed";
    case ContactConfirmed = "contact.confirmed";
    case BroadcastSending = "broadcast.sending";
    case BroadcastSent = "broadcast.sent";
    case BroadcastPaused = "broadcast.paused";
    case BroadcastCanceled = "broadcast.canceled";
    case BroadcastFailed = "broadcast.failed";
}
