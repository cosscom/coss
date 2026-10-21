# frozen_string_literal: true

module Coss
  module Types
    module BroadcastStatus
      extend Coss::Internal::Types::Enum

      DRAFT = "draft"
      SCHEDULED = "scheduled"
      SENDING = "sending"
      PAUSED = "paused"
      SENT = "sent"
      CANCELED = "canceled"
      FAILED = "failed"
    end
  end
end
