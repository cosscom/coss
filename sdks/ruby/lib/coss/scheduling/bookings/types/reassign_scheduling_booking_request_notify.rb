# frozen_string_literal: true

module Coss
  module Scheduling
    module Bookings
      module Types
        class ReassignSchedulingBookingRequestNotify < Internal::Types::Model
          field :attendee, -> { Internal::Types::Boolean }, optional: true, nullable: false
        end
      end
    end
  end
end
