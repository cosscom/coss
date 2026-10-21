# frozen_string_literal: true

module Coss
  module Types
    # What you sent in `checkout` (never the card).
    class RiskCheckoutSignals < Internal::Types::Model
      field :amount, -> { Integer }, optional: false, nullable: false

      field :currency, -> { String }, optional: false, nullable: false

      field :card_country, -> { String }, optional: false, nullable: true

      field :card_funding, -> { Coss::Types::RiskCheckoutSignalsCardFunding }, optional: false, nullable: true

      field :billing_country, -> { String }, optional: false, nullable: true

      field :shipping_country, -> { String }, optional: false, nullable: true
    end
  end
end
