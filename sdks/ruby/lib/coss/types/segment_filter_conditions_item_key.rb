# frozen_string_literal: true

module Coss
  module Types
    class SegmentFilterConditionsItemKey < Internal::Types::Model
      field :field, -> { Coss::Types::SegmentFilterConditionsItemKeyField }, optional: false, nullable: false

      field :key, -> { String }, optional: false, nullable: false

      field :op, -> { Coss::Types::SegmentFilterConditionsItemKeyOp }, optional: false, nullable: false

      field :value, -> { Coss::Types::SegmentFilterConditionsItemKeyValue }, optional: true, nullable: false
    end
  end
end
