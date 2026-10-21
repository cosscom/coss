# frozen_string_literal: true

module Coss
  module Types
    class SegmentFilterConditionsItemConditionsConditionsItemProperty < Internal::Types::Model
      field :key, -> { String }, optional: false, nullable: false

      field :op, -> { Coss::Types::SegmentFilterConditionsItemConditionsConditionsItemPropertyOp }, optional: false, nullable: false

      field :value, -> { Coss::Types::SegmentFilterConditionsItemConditionsConditionsItemPropertyValue }, optional: true, nullable: false
    end
  end
end
