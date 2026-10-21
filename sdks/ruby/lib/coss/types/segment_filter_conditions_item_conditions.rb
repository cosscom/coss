# frozen_string_literal: true

module Coss
  module Types
    class SegmentFilterConditionsItemConditions < Internal::Types::Model
      field :match, -> { Coss::Types::SegmentFilterConditionsItemConditionsMatch }, optional: false, nullable: false

      field :conditions, -> { Internal::Types::Array[Coss::Types::SegmentFilterConditionsItemConditionsConditionsItem] }, optional: false, nullable: false
    end
  end
end
