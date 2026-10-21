# frozen_string_literal: true

module Coss
  module Types
    class BillingHoldsItem < Internal::Types::Model
      field :reason, -> { Coss::Types::BillingHoldsItemReason }, optional: false, nullable: false

      field :since, -> { String }, optional: false, nullable: false
    end
  end
end
