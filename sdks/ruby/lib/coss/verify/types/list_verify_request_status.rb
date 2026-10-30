# frozen_string_literal: true

module Coss
  module Verify
    module Types
      module ListVerifyRequestStatus
        extend Coss::Internal::Types::Enum

        PENDING = "pending"
        APPROVED = "approved"
        EXPIRED = "expired"
        CANCELED = "canceled"
        FAILED = "failed"
        BLOCKED = "blocked"
      end
    end
  end
end
