# frozen_string_literal: true

module Coss
  module Types
    class SegmentFilterConditionsItem < Internal::Types::Model
      extend Coss::Internal::Types::Union

      member -> { Coss::Types::SegmentFilterConditionsItemKey }

      member -> { Coss::Types::SegmentFilterConditionsItemOne }

      member -> { Coss::Types::SegmentFilterConditionsItemAudienceID }

      member -> { Coss::Types::SegmentFilterConditionsItemTopic }

      member -> { Coss::Types::SegmentFilterConditionsItemField }

      member -> { Coss::Types::SegmentFilterConditionsItemConditions }
    end
  end
end
