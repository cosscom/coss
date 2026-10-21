# frozen_string_literal: true

module Coss
  module Types
    # A timestamp for `before`/`after`, a number of days for `within_days`.
    class SegmentFilterConditionsItemFieldValue < Internal::Types::Model
      extend Coss::Internal::Types::Union

      member -> { String }

      member -> { Integer }
    end
  end
end
