# frozen_string_literal: true

module Coss
  module Types
    module ReputationCheckSeverity
      extend Coss::Internal::Types::Enum

      OK = "ok"
      WARNING = "warning"
      SUSPEND = "suspend"
    end
  end
end
