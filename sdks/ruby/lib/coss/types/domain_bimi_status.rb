# frozen_string_literal: true

module Coss
  module Types
    module DomainBimiStatus
      extend Coss::Internal::Types::Enum

      NOT_CHECKED = "not_checked"
      MISSING = "missing"
      INVALID = "invalid"
      CONFIGURED = "configured"
    end
  end
end
