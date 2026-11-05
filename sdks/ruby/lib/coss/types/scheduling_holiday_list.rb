# frozen_string_literal: true

module Coss
  module Types
    class SchedulingHolidayList < Internal::Types::Model
      field :object, -> { Coss::Types::SchedulingHolidayListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::SchedulingHolidayListDataItem] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
