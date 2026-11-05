# frozen_string_literal: true

module Coss
  module Types
    class SchedulingHolidayListDataItem < Internal::Types::Model
      field :date, -> { String }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false

      field :region, -> { String }, optional: false, nullable: true
    end
  end
end
