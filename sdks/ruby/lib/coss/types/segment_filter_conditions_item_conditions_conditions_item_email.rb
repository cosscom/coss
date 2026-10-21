# frozen_string_literal: true

module Coss
  module Types
    class SegmentFilterConditionsItemConditionsConditionsItemEmail < Internal::Types::Model
      field :op, -> { Coss::Types::SegmentFilterConditionsItemConditionsConditionsItemEmailOp }, optional: false, nullable: false

      field :value, -> { String }, optional: false, nullable: false
    end
  end
end
