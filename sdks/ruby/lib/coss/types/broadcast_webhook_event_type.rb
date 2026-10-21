# frozen_string_literal: true

module Coss
  module Types
    module BroadcastWebhookEventType
      extend Coss::Internal::Types::Enum

      BROADCAST_SENDING = "broadcast.sending"
      BROADCAST_SENT = "broadcast.sent"
      BROADCAST_PAUSED = "broadcast.paused"
      BROADCAST_CANCELED = "broadcast.canceled"
      BROADCAST_FAILED = "broadcast.failed"
    end
  end
end
