# frozen_string_literal: true

module Coss
  module Types
    class RiskIPPrivacy < Internal::Types::Model
      field :vpn, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :proxy, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :relay, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :service, -> { String }, optional: false, nullable: true
    end
  end
end
