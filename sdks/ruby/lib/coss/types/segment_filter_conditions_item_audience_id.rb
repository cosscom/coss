# frozen_string_literal: true

module Coss
  module Types
    class SegmentFilterConditionsItemAudienceID < Internal::Types::Model
      field :field, -> { Coss::Types::SegmentFilterConditionsItemAudienceIDField }, optional: false, nullable: false

      field :op, -> { Coss::Types::SegmentFilterConditionsItemAudienceIDOp }, optional: false, nullable: false

      field :audience_id, -> { String }, optional: false, nullable: false
    end
  end
end
