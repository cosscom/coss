# frozen_string_literal: true

module Coss
  module Types
    class SegmentFilterConditionsItemTopic < Internal::Types::Model
      field :field, -> { Coss::Types::SegmentFilterConditionsItemTopicField }, optional: false, nullable: false

      field :op, -> { Coss::Types::SegmentFilterConditionsItemTopicOp }, optional: false, nullable: false

      field :topic, -> { String }, optional: false, nullable: false
    end
  end
end
