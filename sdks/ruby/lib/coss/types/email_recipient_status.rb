# frozen_string_literal: true

module Coss
  module Types
    module EmailRecipientStatus
      extend Coss::Internal::Types::Enum

      QUEUED = "queued"
      SENT = "sent"
      DELIVERY_DELAYED = "delivery_delayed"
      DELIVERED = "delivered"
      BOUNCED = "bounced"
      SUPPRESSED = "suppressed"
      COMPLAINED = "complained"
      FAILED = "failed"
      CANCELED = "canceled"
    end
  end
end
