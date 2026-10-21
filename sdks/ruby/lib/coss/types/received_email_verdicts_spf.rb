# frozen_string_literal: true

module Coss
  module Types
    module ReceivedEmailVerdictsSpf
      extend Coss::Internal::Types::Enum

      PASS = "pass"
      FAIL = "fail"
      GRAY = "gray"
      PROCESSING_FAILED = "processing_failed"
    end
  end
end
