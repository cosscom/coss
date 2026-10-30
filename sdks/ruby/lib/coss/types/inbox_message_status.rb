# frozen_string_literal: true

module Coss
  module Types
    module InboxMessageStatus
      extend Coss::Internal::Types::Enum

      RECEIVED = "received"
      QUEUED = "queued"
      SENT = "sent"
      FAILED = "failed"
      SCHEDULED = "scheduled"
      CANCELED = "canceled"
    end
  end
end
