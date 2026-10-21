# frozen_string_literal: true

module Coss
  module Types
    class LogList < Internal::Types::Model
      field :object, -> { Coss::Types::LogListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::Log] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
