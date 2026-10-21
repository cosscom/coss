# frozen_string_literal: true

module Coss
  module Types
    module SmsSuppressionReason
      extend Coss::Internal::Types::Enum

      OPT_OUT = "opt_out"
      MANUAL = "manual"
      INVALID_NUMBER = "invalid_number"
    end
  end
end
