# frozen_string_literal: true

module Coss
  module Types
    module RiskCheckoutRequestCardFunding
      extend Coss::Internal::Types::Enum

      CREDIT = "credit"
      DEBIT = "debit"
      PREPAID = "prepaid"
      UNKNOWN = "unknown"
    end
  end
end
