# frozen_string_literal: true

module Coss
  module Types
    class SegmentFilterConditionsItemConditionsConditionsItemTopic < Internal::Types::Model
      field :op, -> { Coss::Types::SegmentFilterConditionsItemConditionsConditionsItemTopicOp }, optional: false, nullable: false

      field :topic, -> { String }, optional: false, nullable: false
    end
  end
end
