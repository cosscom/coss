# frozen_string_literal: true

module Coss
  module Scheduling
    module OutOfOffice
      module Types
        class CreateSchedulingOutOfOfficeRequest < Internal::Types::Model
          field :host, -> { String }, optional: true, nullable: false

          field :hosts, -> { Internal::Types::Array[String] }, optional: true, nullable: false

          field :host_filter, -> { Internal::Types::Hash[String, Coss::Scheduling::OutOfOffice::Types::CreateSchedulingOutOfOfficeRequestHostFilterValue] }, optional: true, nullable: false

          field :start, -> { String }, optional: true, nullable: false

          field :end_, -> { String }, optional: true, nullable: false, api_name: "end"

          field :start_date, -> { String }, optional: true, nullable: false

          field :end_date, -> { String }, optional: true, nullable: false

          field :time_zone, -> { String }, optional: true, nullable: false

          field :delegates, -> { Internal::Types::Array[String] }, optional: true, nullable: false

          field :reason, -> { String }, optional: true, nullable: false

          field :notes, -> { String }, optional: true, nullable: false

          field :public_message, -> { String }, optional: true, nullable: false

          field :show_on_calendar, -> { Internal::Types::Boolean }, optional: true, nullable: false

          field :existing_bookings, -> { Coss::Scheduling::OutOfOffice::Types::CreateSchedulingOutOfOfficeRequestExistingBookings }, optional: true, nullable: false

          field :reassign, -> { Coss::Scheduling::OutOfOffice::Types::CreateSchedulingOutOfOfficeRequestReassign }, optional: true, nullable: false

          field :external_id, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
