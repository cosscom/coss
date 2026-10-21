# frozen_string_literal: true

module Coss
  module Types
    module AccountWebhookEventType
      extend Coss::Internal::Types::Enum

      ACCOUNT_REPUTATION_WARNING = "account.reputation_warning"
      ACCOUNT_REPUTATION_RECOVERED = "account.reputation_recovered"
      ACCOUNT_SUSPENDED = "account.suspended"
      ACCOUNT_REINSTATED = "account.reinstated"
      ACCOUNT_MARKETING_PAUSED = "account.marketing_paused"
      ACCOUNT_MARKETING_REINSTATED = "account.marketing_reinstated"
    end
  end
end
