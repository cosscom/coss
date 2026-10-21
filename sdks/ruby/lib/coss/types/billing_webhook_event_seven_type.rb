# frozen_string_literal: true

module Coss
  module Types
    module BillingWebhookEventSevenType
      extend Coss::Internal::Types::Enum

      BILLING_BUDGET_HOLD_PLACED = "billing.budget_hold_placed"
      BILLING_BUDGET_HOLD_LIFTED = "billing.budget_hold_lifted"
    end
  end
end
