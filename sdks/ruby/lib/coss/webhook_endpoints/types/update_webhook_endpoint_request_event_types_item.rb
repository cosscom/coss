# frozen_string_literal: true

module Coss
  module WebhookEndpoints
    module Types
      module UpdateWebhookEndpointRequestEventTypesItem
        extend Coss::Internal::Types::Enum

        EMAIL_SENT = "email.sent"
        EMAIL_DELIVERED = "email.delivered"
        EMAIL_DELIVERY_DELAYED = "email.delivery_delayed"
        EMAIL_BOUNCED = "email.bounced"
        EMAIL_COMPLAINED = "email.complained"
        EMAIL_FAILED = "email.failed"
        EMAIL_SUPPRESSED = "email.suppressed"
        EMAIL_SCHEDULED = "email.scheduled"
        EMAIL_CANCELED = "email.canceled"
        EMAIL_OPENED = "email.opened"
        EMAIL_CLICKED = "email.clicked"
        EMAIL_RESCHEDULED = "email.rescheduled"
        EMAIL_UNSUBSCRIBED = "email.unsubscribed"
        EMAIL_RECEIVED = "email.received"
        DOMAIN_DMARC_REPORT_RECEIVED = "domain.dmarc_report_received"
        ACCOUNT_REPUTATION_WARNING = "account.reputation_warning"
        ACCOUNT_REPUTATION_RECOVERED = "account.reputation_recovered"
        ACCOUNT_SUSPENDED = "account.suspended"
        ACCOUNT_REINSTATED = "account.reinstated"
        ACCOUNT_MARKETING_PAUSED = "account.marketing_paused"
        ACCOUNT_MARKETING_REINSTATED = "account.marketing_reinstated"
        HOOK_ENDPOINT_DISABLED = "hook_endpoint.disabled"
        BILLING_INVOICE_FINALIZED = "billing.invoice_finalized"
        BILLING_INVOICE_PAID = "billing.invoice_paid"
        BILLING_INVOICE_PAYMENT_FAILED = "billing.invoice_payment_failed"
        BILLING_INVOICE_VOIDED = "billing.invoice_voided"
        BILLING_PLAN_CHANGED = "billing.plan_changed"
        BILLING_USAGE_THRESHOLD_REACHED = "billing.usage_threshold_reached"
        BILLING_HOLD_PLACED = "billing.hold_placed"
        BILLING_HOLD_LIFTED = "billing.hold_lifted"
        BILLING_CREDIT_GRANTED = "billing.credit_granted"
        RISK_ASSESSMENT_REVIEW = "risk.assessment.review"
        RISK_ASSESSMENT_REVIEWED = "risk.assessment.reviewed"
        CONTACT_CREATED = "contact.created"
        CONTACT_UPDATED = "contact.updated"
        CONTACT_DELETED = "contact.deleted"
        CONTACT_UNSUBSCRIBED = "contact.unsubscribed"
        CONTACT_CONFIRMED = "contact.confirmed"
        BROADCAST_SENDING = "broadcast.sending"
        BROADCAST_SENT = "broadcast.sent"
        BROADCAST_PAUSED = "broadcast.paused"
        BROADCAST_CANCELED = "broadcast.canceled"
        BROADCAST_FAILED = "broadcast.failed"
      end
    end
  end
end
