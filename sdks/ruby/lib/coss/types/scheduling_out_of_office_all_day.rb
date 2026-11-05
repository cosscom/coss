# frozen_string_literal: true

module Coss
  module Types
    # How it was given, when it was as whole dates.
    class SchedulingOutOfOfficeAllDay < Internal::Types::Model
      field :start_date, -> { String }, optional: false, nullable: false

      field :end_date, -> { String }, optional: false, nullable: false

      field :time_zone, -> { String }, optional: false, nullable: false
    end
  end
end
