# frozen_string_literal: true

module Coss
  module Types
    class SchedulingOutOfOfficeList < Internal::Types::Model
      field :object, -> { Coss::Types::SchedulingOutOfOfficeListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::SchedulingOutOfOffice] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
