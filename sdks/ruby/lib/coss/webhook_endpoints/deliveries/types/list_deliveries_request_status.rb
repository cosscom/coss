# frozen_string_literal: true

module Coss
  module WebhookEndpoints
    module Deliveries
      module Types
        module ListDeliveriesRequestStatus
          extend Coss::Internal::Types::Enum

          PENDING = "pending"
          SUCCEEDED = "succeeded"
          FAILED = "failed"
        end
      end
    end
  end
end
