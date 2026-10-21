# frozen_string_literal: true

module Coss
  module Types
    # A list for `in`/`not_in`; none for `exists`/`not_exists`.
    class SegmentFilterConditionsItemConditionsConditionsItemPropertyValue < Internal::Types::Model
      extend Coss::Internal::Types::Union

      member -> { String }

      member -> { Integer }

      member -> { Internal::Types::Boolean }

      member -> { Internal::Types::Array[Coss::Types::SegmentFilterConditionsItemConditionsConditionsItemPropertyValueThreeItem] }
    end
  end
end
