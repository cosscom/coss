# frozen_string_literal: true

module Coss
  module Types
    class LogDrainList < Internal::Types::Model
      field :object, -> { Coss::Types::LogDrainListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::LogDrain] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
