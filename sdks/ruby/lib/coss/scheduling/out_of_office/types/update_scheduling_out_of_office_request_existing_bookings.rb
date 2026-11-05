# frozen_string_literal: true

module Coss
  module Scheduling
    module OutOfOffice
      module Types
        module UpdateSchedulingOutOfOfficeRequestExistingBookings
          extend Coss::Internal::Types::Enum

          LEAVE = "leave"
          REASSIGN = "reassign"
        end
      end
    end
  end
end
