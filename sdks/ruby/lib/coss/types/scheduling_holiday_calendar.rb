# frozen_string_literal: true

module Coss
  module Types
    class SchedulingHolidayCalendar < Internal::Types::Model
      field :object, -> { Coss::Types::SchedulingHolidayCalendarObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false

      field :source, -> { Coss::Types::SchedulingHolidayCalendarSource }, optional: false, nullable: false

      field :country, -> { String }, optional: false, nullable: true

      field :hosts, -> { Internal::Types::Array[String] }, optional: false, nullable: true

      field :host_filter, -> { Internal::Types::Hash[String, Coss::Types::SchedulingHolidayCalendarHostFilterValue] }, optional: false, nullable: true

      field :regions, -> { Internal::Types::Array[String] }, optional: false, nullable: true

      field :delegates, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :existing_bookings, -> { Coss::Types::SchedulingHolidayCalendarExistingBookings }, optional: false, nullable: false

      field :last_read_at, -> { String }, optional: false, nullable: true

      field :last_error, -> { String }, optional: false, nullable: true

      field :created_at, -> { String }, optional: false, nullable: false

      field :updated_at, -> { String }, optional: false, nullable: false
    end
  end
end
