# frozen_string_literal: true

module Coss
  module Types
    # Only with `checkout` events: what is being paid for, and with which card.
    class RiskCheckoutRequest < Internal::Types::Model
      field :amount, -> { Integer }, optional: false, nullable: false

      field :currency, -> { String }, optional: false, nullable: false

      field :card, -> { Coss::Types::RiskCheckoutRequestCard }, optional: true, nullable: false

      field :billing_country, -> { String }, optional: true, nullable: false

      field :shipping_country, -> { String }, optional: true, nullable: false
    end
  end
end
