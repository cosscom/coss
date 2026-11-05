# frozen_string_literal: true

module Coss
  module Scheduling
    module Bookings
      module Types
        class ReassignSchedulingBookingRequestChangesItem < Internal::Types::Model
          field :from_host, -> { String }, optional: true, nullable: false

          field :to_host, -> { String }, optional: true, nullable: false

          field :auto, -> { Internal::Types::Boolean }, optional: true, nullable: false

          field :preferred_hosts, -> { Internal::Types::Array[String] }, optional: true, nullable: false
        end
      end
    end
  end
end
