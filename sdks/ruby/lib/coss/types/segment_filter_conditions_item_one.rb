# frozen_string_literal: true

module Coss
  module Types
    class SegmentFilterConditionsItemOne < Internal::Types::Model
      field :field, -> { Coss::Types::SegmentFilterConditionsItemOneField }, optional: false, nullable: false

      field :op, -> { Coss::Types::SegmentFilterConditionsItemOneOp }, optional: false, nullable: false

      field :value, -> { String }, optional: false, nullable: false
    end
  end
end
