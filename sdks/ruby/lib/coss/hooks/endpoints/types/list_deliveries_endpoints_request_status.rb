# frozen_string_literal: true

module Coss
  module Hooks
    module Endpoints
      module Types
        module ListDeliveriesEndpointsRequestStatus
          extend Coss::Internal::Types::Enum

          PENDING = "pending"
          SUCCEEDED = "succeeded"
          FAILED = "failed"
        end
      end
    end
  end
end
