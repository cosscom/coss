# frozen_string_literal: true

module Coss
  module Types
    class BroadcastTracking < Internal::Types::Model
      field :opens, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :clicks, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
