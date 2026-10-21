# frozen_string_literal: true

module Coss
  module Types
    module RiskEmailCheckDeliverability
      extend Coss::Internal::Types::Enum

      DELIVERABLE = "deliverable"
      UNDELIVERABLE = "undeliverable"
      UNKNOWN = "unknown"
    end
  end
end
