# frozen_string_literal: true

module Coss
  module Types
    module RiskRuleConditionOperator
      extend Coss::Internal::Types::Enum

      IS = "is"
      EQ = "eq"
      NEQ = "neq"
      GT = "gt"
      GTE = "gte"
      LT = "lt"
      LTE = "lte"
      IN = "in"
      NOT_IN = "not_in"
    end
  end
end
