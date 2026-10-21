# frozen_string_literal: true

module Coss
  module Types
    module EmailStatus
      extend Coss::Internal::Types::Enum

      QUEUED = "queued"
      SENT = "sent"
      FAILED = "failed"
      SCHEDULED = "scheduled"
      CANCELED = "canceled"
    end
  end
end
