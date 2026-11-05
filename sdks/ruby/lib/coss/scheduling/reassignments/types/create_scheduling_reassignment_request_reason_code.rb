# frozen_string_literal: true

module Coss
  module Scheduling
    module Reassignments
      module Types
        module CreateSchedulingReassignmentRequestReasonCode
          extend Coss::Internal::Types::Enum

          HOST_UNAVAILABLE = "host_unavailable"
          OUT_OF_OFFICE = "out_of_office"
          WORKLOAD = "workload"
          CUSTOMER_REQUEST = "customer_request"
          OFFBOARDING = "offboarding"
          OTHER = "other"
        end
      end
    end
  end
end
