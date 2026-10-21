# frozen_string_literal: true

module Coss
  module Types
    module RiskDecision
      extend Coss::Internal::Types::Enum

      ALLOW = "allow"
      REVIEW = "review"
      BLOCK = "block"
    end
  end
end
