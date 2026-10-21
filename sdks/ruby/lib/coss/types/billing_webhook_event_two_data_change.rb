# frozen_string_literal: true

module Coss
  module Types
    module BillingWebhookEventTwoDataChange
      extend Coss::Internal::Types::Enum

      UPGRADE = "upgrade"
      DOWNGRADE = "downgrade"
      CANCELLATION = "cancellation"
      REVERTED = "reverted"
      CONTRACT = "contract"
    end
  end
end
