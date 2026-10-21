# frozen_string_literal: true

module Coss
  module Types
    module BillingWebhookEventZeroType
      extend Coss::Internal::Types::Enum

      BILLING_INVOICE_FINALIZED = "billing.invoice_finalized"
      BILLING_INVOICE_PAID = "billing.invoice_paid"
      BILLING_INVOICE_VOIDED = "billing.invoice_voided"
    end
  end
end
