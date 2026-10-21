# frozen_string_literal: true

module Coss
  module Types
    module ContactConfirmationStatus
      extend Coss::Internal::Types::Enum

      SENT = "sent"
      COOLDOWN = "cooldown"
      LIMIT_REACHED = "limit_reached"
      NOT_PENDING = "not_pending"
    end
  end
end
