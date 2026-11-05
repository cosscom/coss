# frozen_string_literal: true

module Coss
  module Types
    class SchedulingOutOfOffice < Internal::Types::Model
      field :object, -> { Coss::Types::SchedulingOutOfOfficeObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :host, -> { String }, optional: false, nullable: false

      field :start, -> { String }, optional: false, nullable: false

      field :end_, -> { String }, optional: false, nullable: false, api_name: "end"

      field :all_day, -> { Coss::Types::SchedulingOutOfOfficeAllDay }, optional: false, nullable: true

      field :reason, -> { String }, optional: false, nullable: false

      field :notes, -> { String }, optional: false, nullable: true

      field :public_message, -> { String }, optional: false, nullable: true

      field :show_on_calendar, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :delegates, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :existing_bookings, -> { Coss::Types::SchedulingOutOfOfficeExistingBookings }, optional: false, nullable: false

      field :external_id, -> { String }, optional: false, nullable: true

      field :group, -> { String }, optional: false, nullable: true

      field :source, -> { Coss::Types::SchedulingOutOfOfficeSource }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :updated_at, -> { String }, optional: false, nullable: false
    end
  end
end
