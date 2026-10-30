# frozen_string_literal: true

module Coss
  module Types
    class SignEventList < Internal::Types::Model
      field :object, -> { Coss::Types::SignEventListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::SignEvent] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
