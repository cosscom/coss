# frozen_string_literal: true

module Coss
  module Types
    class SchedulingReassignmentSelection < Internal::Types::Model
      field :host, -> { String }, optional: true, nullable: false

      field :out_of_office, -> { String }, optional: true, nullable: false

      field :booking_ids, -> { Internal::Types::Array[String] }, optional: true, nullable: false

      field :series, -> { String }, optional: true, nullable: false

      field :start_after, -> { String }, optional: true, nullable: false

      field :start_before, -> { String }, optional: true, nullable: false

      field :event_types, -> { Internal::Types::Array[String] }, optional: true, nullable: false

      field :external_conflict, -> { Internal::Types::Boolean }, optional: true, nullable: false
    end
  end
end
