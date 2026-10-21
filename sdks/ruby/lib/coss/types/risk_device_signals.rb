# frozen_string_literal: true

module Coss
  module Types
    # What the browser reported through `coss/device` (its device id is only kept as a keyed hash).
    class RiskDeviceSignals < Internal::Types::Model
      field :valid, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :automation, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :timezone, -> { String }, optional: false, nullable: true

      field :language, -> { String }, optional: false, nullable: true

      field :platform, -> { String }, optional: false, nullable: true

      field :screen, -> { String }, optional: false, nullable: true

      field :touch, -> { Internal::Types::Boolean }, optional: false, nullable: true
    end
  end
end
