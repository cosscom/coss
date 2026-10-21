# frozen_string_literal: true

module Coss
  module Types
    class SegmentFilterConditionsItemConditionsConditionsItem < Internal::Types::Model
      extend Coss::Internal::Types::Union

      discriminant :field

      member -> { Coss::Types::SegmentFilterConditionsItemConditionsConditionsItemProperty }, key: "PROPERTY"

      member -> { Coss::Types::SegmentFilterConditionsItemConditionsConditionsItemEmail }, key: "EMAIL"

      member -> { Coss::Types::SegmentFilterConditionsItemConditionsConditionsItemAudience }, key: "AUDIENCE"

      member -> { Coss::Types::SegmentFilterConditionsItemConditionsConditionsItemTopic }, key: "TOPIC"

      member -> { Coss::Types::SegmentFilterConditionsItemConditionsConditionsItemCreatedAt }, key: "CREATED_AT"
    end
  end
end
