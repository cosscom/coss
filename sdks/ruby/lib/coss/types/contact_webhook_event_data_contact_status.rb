# frozen_string_literal: true

module Coss
  module Types
    module ContactWebhookEventDataContactStatus
      extend Coss::Internal::Types::Enum

      SUBSCRIBED = "subscribed"
      UNSUBSCRIBED = "unsubscribed"
      PENDING = "pending"
    end
  end
end
