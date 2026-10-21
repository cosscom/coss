# frozen_string_literal: true

module Coss
  module Types
    module LogDrainBatchStatus
      extend Coss::Internal::Types::Enum

      PENDING = "pending"
      SUCCEEDED = "succeeded"
      FAILED = "failed"
    end
  end
end
