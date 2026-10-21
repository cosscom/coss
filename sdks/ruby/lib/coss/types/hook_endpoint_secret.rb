# frozen_string_literal: true

module Coss
  module Types
    class HookEndpointSecret < Internal::Types::Model
      field :object, -> { Coss::Types::HookEndpointSecretObject }, optional: false, nullable: false

      field :secret, -> { String }, optional: false, nullable: false
    end
  end
end
