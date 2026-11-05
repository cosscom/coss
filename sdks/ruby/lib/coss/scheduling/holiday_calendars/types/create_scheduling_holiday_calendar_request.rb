# frozen_string_literal: true

module Coss
  module Scheduling
    module HolidayCalendars
      module Types
        class CreateSchedulingHolidayCalendarRequest < Internal::Types::Model
          field :name, -> { String }, optional: false, nullable: false

          field :country, -> { String }, optional: true, nullable: false

          field :ics_url, -> { String }, optional: true, nullable: false

          field :hosts, -> { Internal::Types::Array[String] }, optional: true, nullable: false

          field :host_filter, -> { Internal::Types::Hash[String, Coss::Scheduling::HolidayCalendars::Types::CreateSchedulingHolidayCalendarRequestHostFilterValue] }, optional: true, nullable: false

          field :regions, -> { Internal::Types::Array[String] }, optional: true, nullable: false

          field :delegates, -> { Internal::Types::Array[String] }, optional: true, nullable: false

          field :existing_bookings, -> { Coss::Scheduling::HolidayCalendars::Types::CreateSchedulingHolidayCalendarRequestExistingBookings }, optional: true, nullable: false
        end
      end
    end
  end
end
