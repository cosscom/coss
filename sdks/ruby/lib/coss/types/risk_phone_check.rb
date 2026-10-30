# frozen_string_literal: true

module Coss
  module Types
    class RiskPhoneCheck < Internal::Types::Model
      field :object, -> { Coss::Types::RiskPhoneCheckObject }, optional: false, nullable: false

      field :phone, -> { String }, optional: false, nullable: false

      field :valid, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :country, -> { String }, optional: false, nullable: true

      field :line_type, -> { Coss::Types::RiskPhoneCheckLineType }, optional: false, nullable: true

      field :carrier, -> { Coss::Types::RiskPhoneCarrier }, optional: false, nullable: true

      field :sim_swap, -> { Coss::Types::RiskPhoneSimSwap }, optional: false, nullable: true

      field :degraded, -> { Internal::Types::Array[Coss::Types::RiskPhoneCheckDegradedItem] }, optional: false, nullable: false
    end
  end
end
