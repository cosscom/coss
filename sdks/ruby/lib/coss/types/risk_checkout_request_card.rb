# frozen_string_literal: true

module Coss
  module Types
    # What your payment processor tells you about the card.
    class RiskCheckoutRequestCard < Internal::Types::Model
      field :fingerprint, -> { String }, optional: true, nullable: false

      field :country, -> { String }, optional: true, nullable: false

      field :funding, -> { Coss::Types::RiskCheckoutRequestCardFunding }, optional: true, nullable: false
    end
  end
end
