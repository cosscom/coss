# frozen_string_literal: true

module Coss
  module Scheduling
    module Bookings
      module Types
        class ReassignSchedulingBookingRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false

          field :changes, -> { Internal::Types::Array[Coss::Scheduling::Bookings::Types::ReassignSchedulingBookingRequestChangesItem] }, optional: false, nullable: false

          field :reason_code, -> { Coss::Scheduling::Bookings::Types::ReassignSchedulingBookingRequestReasonCode }, optional: false, nullable: false

          field :note, -> { String }, optional: true, nullable: false

          field :overrides, -> { Internal::Types::Array[Coss::Scheduling::Bookings::Types::ReassignSchedulingBookingRequestOverridesItem] }, optional: true, nullable: false

          field :notify, -> { Coss::Scheduling::Bookings::Types::ReassignSchedulingBookingRequestNotify }, optional: true, nullable: false
        end
      end
    end
  end
end
