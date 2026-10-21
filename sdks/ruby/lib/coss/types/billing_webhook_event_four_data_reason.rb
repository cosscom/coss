# frozen_string_literal: true

module Coss
  module Types
    module BillingWebhookEventFourDataReason
      extend Coss::Internal::Types::Enum

      DELINQUENT = "delinquent"
      SPEND_LIMIT = "spend_limit"
      ADMIN = "admin"
    end
  end
end
