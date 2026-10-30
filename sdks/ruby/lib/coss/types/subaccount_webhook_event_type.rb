# frozen_string_literal: true

module Coss
  module Types
    module SubaccountWebhookEventType
      extend Coss::Internal::Types::Enum

      SUBACCOUNT_REPUTATION_WARNING = "subaccount.reputation_warning"
      SUBACCOUNT_REPUTATION_RECOVERED = "subaccount.reputation_recovered"
      SUBACCOUNT_PAUSED = "subaccount.paused"
      SUBACCOUNT_REINSTATED = "subaccount.reinstated"
    end
  end
end
