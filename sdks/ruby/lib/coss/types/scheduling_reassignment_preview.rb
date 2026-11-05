# frozen_string_literal: true

module Coss
  module Types
    class SchedulingReassignmentPreview < Internal::Types::Model
      field :object, -> { Coss::Types::SchedulingReassignmentPreviewObject }, optional: false, nullable: false

      field :items, -> { Internal::Types::Array[Coss::Types::SchedulingReassignmentPreviewItemsItem] }, optional: false, nullable: false

      field :truncated, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
