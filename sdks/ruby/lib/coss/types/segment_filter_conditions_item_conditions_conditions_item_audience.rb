# frozen_string_literal: true

module Coss
  module Types
    class SegmentFilterConditionsItemConditionsConditionsItemAudience < Internal::Types::Model
      field :op, -> { Coss::Types::SegmentFilterConditionsItemConditionsConditionsItemAudienceOp }, optional: false, nullable: false

      field :audience_id, -> { String }, optional: false, nullable: false
    end
  end
end
