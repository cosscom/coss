# frozen_string_literal: true

module Coss
  module Types
    module SmsStatus
      extend Coss::Internal::Types::Enum

      QUEUED = "queued"
      SCHEDULED = "scheduled"
      SENT = "sent"
      DELIVERED = "delivered"
      UNDELIVERED = "undelivered"
      FAILED = "failed"
      CANCELED = "canceled"
    end
  end
end
