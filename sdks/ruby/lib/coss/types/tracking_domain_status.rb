# frozen_string_literal: true

module Coss
  module Types
    module TrackingDomainStatus
      extend Coss::Internal::Types::Enum

      PENDING = "pending"
      ACTIVE = "active"
      TEMPORARY_FAILURE = "temporary_failure"
      FAILED = "failed"
      DELETING = "deleting"
    end
  end
end
