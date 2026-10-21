# frozen_string_literal: true

module Coss
  module LogDrains
    module Batches
      module Types
        module ListBatchesRequestStatus
          extend Coss::Internal::Types::Enum

          PENDING = "pending"
          SUCCEEDED = "succeeded"
          FAILED = "failed"
        end
      end
    end
  end
end
