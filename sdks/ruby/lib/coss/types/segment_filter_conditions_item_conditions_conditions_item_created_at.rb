# frozen_string_literal: true

module Coss
  module Types
    class SegmentFilterConditionsItemConditionsConditionsItemCreatedAt < Internal::Types::Model
      field :op, -> { Coss::Types::SegmentFilterConditionsItemConditionsConditionsItemCreatedAtOp }, optional: false, nullable: false

      field :value, -> { Coss::Types::SegmentFilterConditionsItemConditionsConditionsItemCreatedAtValue }, optional: false, nullable: false
    end
  end
end
