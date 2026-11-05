# frozen_string_literal: true

module Coss
  module Types
    class SchedulingReassignmentItemList < Internal::Types::Model
      field :object, -> { Coss::Types::SchedulingReassignmentItemListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::SchedulingReassignmentItem] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
