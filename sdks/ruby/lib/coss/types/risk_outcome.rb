# frozen_string_literal: true

module Coss
  module Types
    module RiskOutcome
      extend Coss::Internal::Types::Enum

      LEGITIMATE = "legitimate"
      FRAUD = "fraud"
      ABUSE = "abuse"
    end
  end
end
