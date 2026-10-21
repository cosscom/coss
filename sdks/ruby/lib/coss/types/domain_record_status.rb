# frozen_string_literal: true

module Coss
  module Types
    module DomainRecordStatus
      extend Coss::Internal::Types::Enum

      VERIFIED = "verified"
      MISSING = "missing"
      MISMATCH = "mismatch"
      NOT_CHECKED = "not_checked"
    end
  end
end
