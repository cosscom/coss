# frozen_string_literal: true

module Coss
  module Types
    module SchedulingReassignmentReasonCode
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
