# frozen_string_literal: true

module Coss
  module Types
    module RiskEmailSignalsDeliverability
      extend Coss::Internal::Types::Enum

      DELIVERABLE = "deliverable"
      UNDELIVERABLE = "undeliverable"
      UNKNOWN = "unknown"
    end
  end
end
