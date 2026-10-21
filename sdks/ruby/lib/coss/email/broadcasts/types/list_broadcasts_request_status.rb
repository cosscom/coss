# frozen_string_literal: true

module Coss
  module Email
    module Broadcasts
      module Types
        module ListBroadcastsRequestStatus
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
  end
end
