# frozen_string_literal: true

module Coss
  module Types
    module ReputationStatus
      extend Coss::Internal::Types::Enum

      GOOD = "good"
      WARNING = "warning"
      SUSPENDED = "suspended"
    end
  end
end
