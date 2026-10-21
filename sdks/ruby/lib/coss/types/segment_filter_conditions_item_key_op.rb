# frozen_string_literal: true

module Coss
  module Types
    module SegmentFilterConditionsItemKeyOp
      extend Coss::Internal::Types::Enum

      EQ = "eq"
      NEQ = "neq"
      IN = "in"
      NOT_IN = "not_in"
      GT = "gt"
      GTE = "gte"
      LT = "lt"
      LTE = "lte"
      CONTAINS = "contains"
      STARTS_WITH = "starts_with"
      EXISTS = "exists"
      NOT_EXISTS = "not_exists"
    end
  end
end
