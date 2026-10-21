# frozen_string_literal: true

module Coss
  module Types
    module DomainStatus
      extend Coss::Internal::Types::Enum

      PENDING = "pending"
      VERIFIED = "verified"
      TEMPORARY_FAILURE = "temporary_failure"
      FAILED = "failed"
      DELETING = "deleting"
    end
  end
end
