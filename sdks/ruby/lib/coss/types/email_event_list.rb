# frozen_string_literal: true

module Coss
  module Types
    class EmailEventList < Internal::Types::Model
      field :object, -> { Coss::Types::EmailEventListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::EmailEvent] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
