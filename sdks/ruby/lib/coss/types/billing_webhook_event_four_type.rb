# frozen_string_literal: true

module Coss
  module Types
    module BillingWebhookEventFourType
      extend Coss::Internal::Types::Enum

      BILLING_HOLD_PLACED = "billing.hold_placed"
      BILLING_HOLD_LIFTED = "billing.hold_lifted"
    end
  end
end
