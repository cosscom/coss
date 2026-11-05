# frozen_string_literal: true

module Coss
  module Types
    class DeletedSchedulingHolidayCalendar < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :deleted, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
