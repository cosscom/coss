# frozen_string_literal: true

module Coss
  module Scheduling
    module Reassignments
      module Types
        class PreviewSchedulingReassignmentRequest < Internal::Types::Model
          field :selection, -> { Coss::Types::SchedulingReassignmentSelection }, optional: false, nullable: false

          field :strategy, -> { Coss::Types::SchedulingReassignmentStrategy }, optional: true, nullable: false

          field :overrides, -> { Internal::Types::Array[Coss::Scheduling::Reassignments::Types::PreviewSchedulingReassignmentRequestOverridesItem] }, optional: true, nullable: false
        end
      end
    end
  end
end
