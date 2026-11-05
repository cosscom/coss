# frozen_string_literal: true

module Coss
  module Scheduling
    module Reassignments
      module Types
        module UndoSchedulingReassignmentRequestOverridesItem
          extend Coss::Internal::Types::Enum

          ANY_HOST = "any_host"
          OUT_OF_OFFICE = "out_of_office"
          OUTSIDE_AVAILABILITY = "outside_availability"
          HOST_BUSY = "host_busy"
          LIMIT_REACHED = "limit_reached"
          CALENDAR_UNVERIFIED = "calendar_unverified"
        end
      end
    end
  end
end
