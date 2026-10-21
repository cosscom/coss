# frozen_string_literal: true

module Coss
  module Types
    # Logins of a user with history: whether the country or network is new for them.
    class RiskLoginSignals < Internal::Types::Model
      field :new_country, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :new_network, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
