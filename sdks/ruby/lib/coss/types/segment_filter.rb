# frozen_string_literal: true

module Coss
  module Types
    # Which contacts belong to the segment. Conditions on `property` (custom properties), `email`, `audience`
    # membership, `topic` subscription and `created_at`; one level of nested `{ match, conditions }` groups.
    class SegmentFilter < Internal::Types::Model
      field :version, -> { Integer }, optional: false, nullable: false

      field :match, -> { Coss::Types::SegmentFilterMatch }, optional: false, nullable: false

      field :conditions, -> { Internal::Types::Array[Coss::Types::SegmentFilterConditionsItem] }, optional: false, nullable: false
    end
  end
end
