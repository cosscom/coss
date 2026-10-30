# frozen_string_literal: true

module Coss
  module Types
    class RiskPhoneSimSwap < Internal::Types::Model
      field :recent, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :swapped_at, -> { String }, optional: false, nullable: true

      field :period, -> { String }, optional: false, nullable: true
    end
  end
end
