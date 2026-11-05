# frozen_string_literal: true

module Coss
  module Scheduling
    module HolidayCalendars
      module Types
        class UpdateSchedulingHolidayCalendarRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false

          field :name, -> { String }, optional: true, nullable: false

          field :hosts, -> { Internal::Types::Array[String] }, optional: true, nullable: false

          field :host_filter, -> { Internal::Types::Hash[String, Coss::Scheduling::HolidayCalendars::Types::UpdateSchedulingHolidayCalendarRequestHostFilterValue] }, optional: true, nullable: false

          field :regions, -> { Internal::Types::Array[String] }, optional: true, nullable: false

          field :delegates, -> { Internal::Types::Array[String] }, optional: true, nullable: false

          field :existing_bookings, -> { Coss::Scheduling::HolidayCalendars::Types::UpdateSchedulingHolidayCalendarRequestExistingBookings }, optional: true, nullable: false
        end
      end
    end
  end
end
