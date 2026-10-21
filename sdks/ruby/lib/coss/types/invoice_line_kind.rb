# frozen_string_literal: true

module Coss
  module Types
    module InvoiceLineKind
      extend Coss::Internal::Types::Enum

      PLAN_FEE = "plan_fee"
      PRORATION = "proration"
      USAGE = "usage"
      CREDIT = "credit"
      DISCOUNT = "discount"
      COMMITMENT_FEE = "commitment_fee"
      COMMITMENT_SHORTFALL = "commitment_shortfall"
      ADD_ON = "add_on"
      ADJUSTMENT = "adjustment"
      WRITE_OFF = "write_off"
    end
  end
end
