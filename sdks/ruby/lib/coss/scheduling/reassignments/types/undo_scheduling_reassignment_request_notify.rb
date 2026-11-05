# frozen_string_literal: true

module Coss
  module Scheduling
    module Reassignments
      module Types
        class UndoSchedulingReassignmentRequestNotify < Internal::Types::Model
          field :attendees, -> { Internal::Types::Boolean }, optional: true, nullable: false

          field :hosts, -> { Coss::Scheduling::Reassignments::Types::UndoSchedulingReassignmentRequestNotifyHosts }, optional: true, nullable: false
        end
      end
    end
  end
end
