# frozen_string_literal: true

module Coss
  module Types
    module DomainMailFromStatus
      extend Coss::Internal::Types::Enum

      PENDING = "pending"
      SUCCESS = "success"
      TEMPORARY_FAILURE = "temporary_failure"
      FAILED = "failed"
    end
  end
end
