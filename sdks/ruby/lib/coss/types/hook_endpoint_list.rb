# frozen_string_literal: true

module Coss
  module Types
    class HookEndpointList < Internal::Types::Model
      field :object, -> { Coss::Types::HookEndpointListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::HookEndpoint] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
