# frozen_string_literal: true

module Coss
  module Types
    module SubaccountReputationStatus
      extend Coss::Internal::Types::Enum

      GOOD = "good"
      WARNING = "warning"
      PAUSED = "paused"
    end
  end
end
