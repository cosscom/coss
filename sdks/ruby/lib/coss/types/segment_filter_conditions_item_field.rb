# frozen_string_literal: true

module Coss
  module Types
    class SegmentFilterConditionsItemField < Internal::Types::Model
      field :field, -> { Coss::Types::SegmentFilterConditionsItemFieldField }, optional: false, nullable: false

      field :op, -> { Coss::Types::SegmentFilterConditionsItemFieldOp }, optional: false, nullable: false

      field :value, -> { Coss::Types::SegmentFilterConditionsItemFieldValue }, optional: false, nullable: false
    end
  end
end
